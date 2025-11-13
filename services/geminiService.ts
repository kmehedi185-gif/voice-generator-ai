
import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const voiceMap: { [key: string]: { apiVoice: string; toneInstruction: string } } = {
  'real_man_voice': { apiVoice: 'Charon', toneInstruction: 'Adopt a deep, warm, and confident tone with slight breathiness and natural pacing.' },
  'motivational_male': { apiVoice: 'Charon', toneInstruction: 'The tone should be deep and confident.' },
  'motivational_female': { apiVoice: 'Kore', toneInstruction: 'The tone should be energetic and uplifting.' },
  'calm_female': { apiVoice: 'Kore', toneInstruction: 'The tone should be soft and peaceful.' },
  'narrator_male': { apiVoice: 'Charon', toneInstruction: 'The tone should be clear and balanced.' },
  'cinematic_male': { apiVoice: 'Charon', toneInstruction: 'The tone should be dramatic and intense.' },
  'cinematic_female': { apiVoice: 'Kore', toneInstruction: 'The tone should be epic and emotional.' },
  'storyteller_male': { apiVoice: 'Fenrir', toneInstruction: 'The tone should be warm and expressive.' },
  'storyteller_female': { apiVoice: 'Kore', toneInstruction: 'The tone should be comforting and vivid.' },
  'corporate_male': { apiVoice: 'Charon', toneInstruction: 'The tone should be neutral and confident.' },
  'corporate_female': { apiVoice: 'Kore', toneInstruction: 'The tone should be professional and calm.' },
  'robotic_male': { apiVoice: 'Puck', toneInstruction: 'Adopt a slightly synthetic, robotic male voice.' },
  'robotic_female': { apiVoice: 'Kore', toneInstruction: 'Adopt a digital, sleek, robotic female voice.' },
  'standard_male': { apiVoice: 'Charon', toneInstruction: 'Adopt a standard, neutral male voice.' },
  'standard_female': { apiVoice: 'Kore', toneInstruction: 'Adopt a standard, neutral female voice.' },
  'baby_boy': { apiVoice: 'Kore', toneInstruction: 'Adopt a high-pitched, playful, and innocent young boy\'s voice, simulating a baby or toddler\'s tone.' },
  'baby_girl': { apiVoice: 'Kore', toneInstruction: 'Adopt a high-pitched, playful, and innocent young girl\'s voice, simulating a baby or toddler\'s tone.' },
  'spooky_ethereal': { apiVoice: 'Kore', toneInstruction: 'Adopt a soft, ethereal, and slightly echoing cinematic female voice. The tone should be spooky and suitable for horror or mystery, with a haunting quality.' },
  'glitched_ghost': { apiVoice: 'Puck', toneInstruction: 'Adopt a digitally distorted, eerie whispering voice, like a glitched robotic ghost. The tone should be unsettling and synthetic.' },
  'spirit_narrator': { apiVoice: 'Kore', toneInstruction: 'Adopt a calm, distant, and floating narrative voice, like a spirit telling a story. The tone should be serene yet otherworldly.' },
};


const getSpeedDescription = (speed: number): string => {
  if (speed < 0.75) return 'very slow';
  if (speed < 0.9) return 'slow';
  if (speed <= 1.1) return 'normal';
  if (speed < 1.5) return 'fast';
  return 'very fast';
};

export const generateMotivationalSpeech = async (text: string, voiceName: string, voiceStyle: string, accent: string, speed: number): Promise<string> => {
  if (!text) {
    throw new Error("Input text cannot be empty.");
  }

  const voiceConfig = voiceMap[voiceName] || voiceMap['motivational_male'];
  const apiVoiceName = voiceConfig.apiVoice;

  const speedDescription = getSpeedDescription(speed);
  const accentInstruction = accent && accent !== 'Default' ? `with a ${accent.toLowerCase()} accent` : '';
  
  const mainInstructionParts = [
    `Adopt a ${voiceStyle.toLowerCase()} voice style`,
    accentInstruction,
  ];
  const mainInstruction = mainInstructionParts.filter(Boolean).join(' ');

  const prompt = `${mainInstruction}. ${voiceConfig.toneInstruction} Deliver the following text at a ${speedDescription} pace, with natural pauses for emphasis: "${text}"`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: apiVoiceName },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      throw new Error("No audio data was returned from the API.");
    }

    return audioData;
  } catch (error) {
    console.error("Error generating speech with Gemini API:", error);

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('api key not valid')) {
        throw new Error('The API key is invalid. Please check your configuration.');
      }
      if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        throw new Error('You have exceeded the request limit. Please wait a moment and try again.');
      }
      if (errorMessage.includes('invalid argument') || errorMessage.includes('bad request') || errorMessage.includes('400')) {
        throw new Error('The input text may be invalid. Please revise your script and try again.');
      }
      if (errorMessage.includes('safety settings') || errorMessage.includes('blocked')) {
        throw new Error('The request was blocked due to safety filters. Please modify your text.');
      }
      if (errorMessage.includes('server error') || errorMessage.includes('500')) {
        throw new Error('The AI service is currently unavailable. Please try again later.');
      }
    }
    
    // Generic fallback for other errors
    throw new Error("Failed to generate speech due to an unexpected error.");
  }
};

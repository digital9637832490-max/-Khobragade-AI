export type AiResult = Record<string, unknown>;

export interface TextProvider { generate(input:Record<string,unknown>):Promise<AiResult>; }
export interface ImageProvider { generate(input:Record<string,unknown>):Promise<AiResult>; }
export interface VideoProvider { generate(input:Record<string,unknown>):Promise<AiResult>; }

class MockText implements TextProvider {
  async generate(input:any){ const topic=input.topic || 'Your Topic'; return {
    titles:[`${topic}: Complete Guide`, `5 Things About ${topic}`, `${topic} Explained Simply`],
    description:`Generated starter description for ${topic}. Configure AI_TEXT_PROVIDER for real generation.`,
    tags:[String(topic),'youtube','creator'],
    hashtags:['#YouTube','#CreatorStudio']
  }; }
}
class MockImage implements ImageProvider {
  async generate(input:any){ return {previewUrl:null, message:'Configure AI_IMAGE_PROVIDER for real thumbnail generation', input}; }
}
class MockVideo implements VideoProvider {
  async generate(input:any){ return {previewUrl:null, message:'Configure AI_VIDEO_PROVIDER for real rendering', input}; }
}

export const textProvider:TextProvider = new MockText();
export const imageProvider:ImageProvider = new MockImage();
export const videoProvider:VideoProvider = new MockVideo();

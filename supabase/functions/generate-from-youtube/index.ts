import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Style configurations for thumbnail generation
const STYLE_CONFIGS: Record<string, { description: string; elements: string[] }> = {
  professional: {
    description: 'Clean, polished, business-appropriate design with subtle colors and professional typography',
    elements: ['clean lines', 'minimal clutter', 'professional fonts', 'muted colors with one accent']
  },
  bold: {
    description: 'High contrast, attention-grabbing with dramatic lighting and bold text',
    elements: ['extreme contrast', 'bold text', 'dramatic shadows', 'vibrant colors']
  },
  minimal: {
    description: 'Simple, elegant with lots of whitespace and clean typography',
    elements: ['whitespace', 'simple shapes', 'clean fonts', 'limited color palette']
  },
  gaming: {
    description: 'Energetic, vibrant colors with gaming aesthetic and dynamic compositions',
    elements: ['neon colors', 'glowing effects', 'dynamic angles', 'gaming UI elements']
  },
  cinematic: {
    description: 'Movie poster style with dramatic lighting and cinematic composition',
    elements: ['letterbox format', 'cinematic lighting', 'movie poster typography', 'dramatic atmosphere']
  },
  viral: {
    description: 'Maximum click appeal with emotional triggers and curiosity gaps',
    elements: ['shocked expressions', 'arrows pointing', 'circles highlighting', 'bold countdown numbers', 'question marks']
  },
  educational: {
    description: 'Clear, informative design that conveys knowledge and trustworthiness',
    elements: ['diagrams', 'step indicators', 'clean infographics', 'educational icons']
  },
  vlog: {
    description: 'Personal, authentic feel with natural lighting and casual typography',
    elements: ['natural lighting', 'casual fonts', 'personal branding', 'location context']
  },
  documentary: {
    description: 'Serious, professional tone with cinematic quality and impactful imagery',
    elements: ['high contrast black and white option', 'powerful imagery', 'documentary fonts', 'impactful quotes']
  },
  comedy: {
    description: 'Fun, playful design with bright colors and humorous elements',
    elements: ['bright colors', 'playful fonts', 'exaggerated expressions', 'comic elements']
  }
};

// Persona style guides
const PERSONA_CONFIGS: Record<string, string> = {
  none: '',
  mrbeast: 'Extremely bold, massive text, red/yellow colors, shocked expressions, money imagery, challenge vibes',
  mkbhd: 'Clean, minimalist, tech-focused, red accent on black, premium feel, subtle branding',
  veritasium: 'Science aesthetic, curiosity-inducing, educational but intriguing, question-driven',
  pewdiepie: 'Meme culture, reaction faces, gaming aesthetic, red/black colors, casual and fun',
  casey: 'Cinematic, urban, storytelling vibe, bold fonts, adventure aesthetic',
  linus: 'Tech products, orange accent, product showcase, clean tech aesthetic',
  vsauce: 'Mind-bending, curious, science with humor, question marks, brain imagery',
  kurzgesagt: 'Flat design, space themes, soft gradients, minimalist icons, educational',
  cocomelon: 'Bright primary colors, cartoon style, child-friendly, playful characters',
  dude_perfect: 'Sports aesthetic, action shots, blue branding, trick shot vibes, energy',
  marques: 'Tech review style, clean gradients, product focus, premium aesthetic',
  graham_stephan: 'Finance aesthetic, money imagery, clean professional, real estate vibes',
  ali_abdaal: 'Productivity aesthetic, clean minimal, study vibes, soft colors'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      youtubeUrl, 
      style = 'viral', 
      persona = 'none',
      platform = 'youtube',
      overlays = [],
      generateMultiple = true,
      generateTitles = true,
      preserveOriginal = true
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!youtubeUrl) {
      throw new Error('YouTube URL is required');
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    console.log('Processing YouTube video:', videoId, { style, persona, platform });

    // Get the existing thumbnail
    const originalThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    
    // Step 1: Analyze the existing thumbnail comprehensively
    console.log('Step 1: Analyzing original thumbnail...');
    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert YouTube thumbnail analyst. Analyze this thumbnail in detail.

ANALYZE:
1. What is the video topic/content about?
2. What are the main visual elements (people, objects, text, colors)?
3. What emotions does it try to evoke?
4. Who is the target audience?
5. What type of content is this (tutorial, vlog, review, entertainment, etc)?
6. What's the current thumbnail doing well?
7. What could be improved for higher CTR?
8. Suggest an improved thumbnail concept.
9. What text would work better on the thumbnail?

Return ONLY valid JSON (no markdown, no code blocks):
{
  "videoTopic": "string describing the video topic",
  "visualElements": ["element1", "element2"],
  "emotions": ["emotion1", "emotion2"],
  "targetAudience": "description of target audience",
  "contentType": "type of content",
  "strengths": ["what works well"],
  "weaknesses": ["what could improve"],
  "improvedConcept": "detailed description of improved thumbnail concept",
  "suggestedText": "suggested text overlay",
  "colorScheme": ["suggested colors"]
}`
              },
              {
                type: 'image_url',
                image_url: { url: originalThumbnail }
              }
            ]
          }
        ],
      }),
    });

    let videoAnalysis = null;
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      const content = analysisData.choices?.[0]?.message?.content;
      console.log('Analysis response:', content);
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            videoAnalysis = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('Failed to parse analysis JSON:', e);
          }
        }
      }
    } else {
      console.error('Analysis failed:', await analysisResponse.text());
    }

    // Step 2: Generate improved thumbnails
    console.log('Step 2: Generating improved thumbnails...');
    const styleConfig = STYLE_CONFIGS[style] || STYLE_CONFIGS.viral;
    const personaStyle = PERSONA_CONFIGS[persona] || '';
    
    const numVariations = generateMultiple ? 3 : 1;
    const generatedThumbnails: string[] = [];

    for (let i = 0; i < numVariations; i++) {
      const variationPrompt = i === 0 ? 'primary version focusing on maximum CTR' :
                              i === 1 ? 'alternative version with different composition' :
                              'bold experimental version pushing boundaries';

      let generatePrompt = `Create a professional YouTube thumbnail for: "${videoAnalysis?.videoTopic || 'video content'}"

STYLE: ${styleConfig.description}
STYLE ELEMENTS: ${styleConfig.elements.join(', ')}
${personaStyle ? `CREATOR STYLE: ${personaStyle}` : ''}
${preserveOriginal && videoAnalysis ? `PRESERVE ELEMENTS: Keep the essence of ${videoAnalysis.visualElements?.slice(0, 3).join(', ')}` : ''}

CONCEPT: ${videoAnalysis?.improvedConcept || 'Create an eye-catching thumbnail that maximizes clicks'}

TEXT TO INCLUDE: "${videoAnalysis?.suggestedText || ''}"

VARIATION: This is ${variationPrompt}

TECHNICAL REQUIREMENTS:
- YouTube thumbnail aspect ratio (16:9)
- Ultra high resolution, photorealistic quality
- High contrast for small preview visibility
- Bold, readable text if text is included
- Professional quality matching top YouTubers

${overlays.includes('subscribe') ? 'Include a subtle subscribe button element' : ''}
${overlays.includes('views') ? 'Include view count style element' : ''}
${overlays.includes('like') ? 'Include like button element' : ''}
${overlays.includes('duration') ? 'Include video duration badge' : ''}

Make this thumbnail IRRESISTIBLE to click.`;

      console.log(`Generating thumbnail variation ${i + 1}...`);
      
      const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
          messages: [
            { role: 'user', content: generatePrompt }
          ],
          modalities: ['image', 'text']
        }),
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (generatedImage) {
          generatedThumbnails.push(generatedImage);
          console.log(`Thumbnail ${i + 1} generated successfully`);
        }
      } else {
        console.error(`Failed to generate thumbnail ${i + 1}:`, await imageResponse.text());
      }
    }

    // Step 3: Generate viral titles if requested
    let titles = null;
    if (generateTitles && videoAnalysis) {
      console.log('Step 3: Generating viral titles...');
      const titleResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-preview',
          messages: [
            {
              role: 'user',
              content: `You are a viral YouTube title expert. Generate 5 high-CTR titles for a video about: "${videoAnalysis.videoTopic}"

Target audience: ${videoAnalysis.targetAudience || 'general'}
Content type: ${videoAnalysis.contentType || 'entertainment'}
Platform: ${platform}

TITLE REQUIREMENTS:
- Use psychological triggers (curiosity gap, FOMO, shock, benefit-driven)
- Optimal length (50-60 characters)
- Include power words
- Create urgency or curiosity
- Match the thumbnail concept

Return ONLY valid JSON array (no markdown):
[
  {
    "title": "the viral title",
    "reason": "why this works",
    "estimatedCTR": "high|medium|low",
    "hook": "the psychological hook used",
    "emotion": "primary emotion triggered"
  }
]`
            }
          ],
        }),
      });

      if (titleResponse.ok) {
        const titleData = await titleResponse.json();
        const titleContent = titleData.choices?.[0]?.message?.content;
        if (titleContent) {
          const jsonMatch = titleContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              titles = JSON.parse(jsonMatch[0]);
            } catch (e) {
              console.error('Failed to parse titles JSON:', e);
            }
          }
        }
      }
    }

    console.log('Generation complete!', {
      thumbnailsGenerated: generatedThumbnails.length,
      titlesGenerated: titles?.length || 0
    });

    return new Response(JSON.stringify({
      success: true,
      videoId,
      originalThumbnail,
      generatedThumbnails,
      analysis: videoAnalysis,
      titles,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-from-youtube:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to generate thumbnail from YouTube' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

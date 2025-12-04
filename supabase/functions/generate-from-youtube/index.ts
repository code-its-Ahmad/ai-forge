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

// Style configurations
const STYLE_CONFIGS: Record<string, { description: string; elements: string[] }> = {
  professional: {
    description: 'Clean, polished, business-appropriate design',
    elements: ['clean lines', 'minimal clutter', 'professional fonts', 'muted colors']
  },
  bold: {
    description: 'High contrast, dramatic lighting, bold text',
    elements: ['extreme contrast', 'bold text', 'dramatic shadows', 'vibrant colors']
  },
  minimal: {
    description: 'Simple, elegant with whitespace',
    elements: ['whitespace', 'simple shapes', 'clean fonts', 'limited colors']
  },
  gaming: {
    description: 'Energetic, vibrant, gaming aesthetic',
    elements: ['neon colors', 'glowing effects', 'dynamic angles', 'gaming UI']
  },
  cinematic: {
    description: 'Movie poster style, dramatic lighting',
    elements: ['letterbox', 'cinematic lighting', 'movie typography', 'dramatic atmosphere']
  },
  viral: {
    description: 'Maximum click appeal, emotional triggers',
    elements: ['shocked expressions', 'arrows', 'circles', 'bold numbers', 'question marks']
  },
  educational: {
    description: 'Clear, informative, trustworthy',
    elements: ['diagrams', 'step indicators', 'infographics', 'educational icons']
  },
  vlog: {
    description: 'Personal, authentic, natural',
    elements: ['natural lighting', 'casual fonts', 'personal branding', 'location context']
  },
  documentary: {
    description: 'Serious, professional, impactful',
    elements: ['high contrast', 'powerful imagery', 'documentary fonts', 'impactful quotes']
  },
  comedy: {
    description: 'Fun, playful, bright',
    elements: ['bright colors', 'playful fonts', 'exaggerated expressions', 'comic elements']
  }
};

// Persona configurations
const PERSONA_CONFIGS: Record<string, string> = {
  none: '',
  mrbeast: 'Bold, massive text, red/yellow, shocked faces, money imagery, challenge vibes',
  mkbhd: 'Clean minimalist, tech-focused, red on black, premium feel',
  veritasium: 'Science aesthetic, curiosity-inducing, educational, question-driven',
  pewdiepie: 'Meme culture, reactions, gaming, red/black, casual fun',
  casey: 'Cinematic, urban, storytelling, bold fonts, adventure',
  linus: 'Tech products, orange accent, product showcase, clean tech',
  vsauce: 'Mind-bending, curious, science humor, question marks',
  kurzgesagt: 'Flat design, space themes, soft gradients, minimalist icons',
  cocomelon: 'Bright primary colors, cartoon, child-friendly, playful',
  dude_perfect: 'Sports, action shots, blue branding, trick shots, energy',
  marques: 'Tech review, clean gradients, product focus, premium',
  graham_stephan: 'Finance, money imagery, professional, real estate',
  ali_abdaal: 'Productivity, clean minimal, study vibes, soft colors'
};

// Generate a single thumbnail
async function generateThumbnail(
  apiKey: string,
  prompt: string,
  variationIndex: number
): Promise<string | null> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text']
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) {
        console.log(`Thumbnail ${variationIndex + 1} generated`);
        return imageUrl;
      }
    } else {
      console.error(`Thumbnail ${variationIndex + 1} failed:`, response.status);
    }
  } catch (e) {
    console.error(`Thumbnail ${variationIndex + 1} error:`, e);
  }
  return null;
}

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
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    if (!youtubeUrl) throw new Error('YouTube URL is required');

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) throw new Error('Invalid YouTube URL');

    console.log('Processing:', videoId, { style, persona });

    const originalThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const styleConfig = STYLE_CONFIGS[style] || STYLE_CONFIGS.viral;
    const personaStyle = PERSONA_CONFIGS[persona] || '';

    // Step 1: Quick analysis (simplified for speed)
    console.log('Analyzing...');
    const analysisPromise = fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this YouTube thumbnail briefly. Return JSON only:
{
  "videoTopic": "brief topic",
  "visualElements": ["element1", "element2"],
  "emotions": ["emotion1"],
  "targetAudience": "audience",
  "contentType": "type",
  "improvedConcept": "improved thumbnail concept",
  "suggestedText": "text for thumbnail"
}`
            },
            { type: 'image_url', image_url: { url: originalThumbnail } }
          ]
        }],
      }),
    });

    // Wait for analysis
    let videoAnalysis = null;
    try {
      const analysisResponse = await analysisPromise;
      if (analysisResponse.ok) {
        const data = await analysisResponse.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const match = content.match(/\{[\s\S]*\}/);
          if (match) videoAnalysis = JSON.parse(match[0]);
        }
      }
    } catch (e) {
      console.error('Analysis error:', e);
    }

    console.log('Analysis done:', videoAnalysis?.videoTopic);

    // Step 2: Generate thumbnails in PARALLEL for speed
    const numVariations = generateMultiple ? 3 : 1;
    const variations = ['maximum CTR focus', 'alternative composition', 'bold experimental'];
    
    const overlayText = [
      overlays.includes('subscribe') ? 'subscribe button' : '',
      overlays.includes('views') ? 'view counter' : '',
      overlays.includes('like') ? 'like button' : '',
      overlays.includes('duration') ? 'duration badge' : ''
    ].filter(Boolean).join(', ');

    const thumbnailPromises = Array.from({ length: numVariations }, (_, i) => {
      const prompt = `Create YouTube thumbnail (16:9, high resolution):

TOPIC: ${videoAnalysis?.videoTopic || 'engaging content'}
STYLE: ${styleConfig.description} - ${styleConfig.elements.join(', ')}
${personaStyle ? `CREATOR STYLE: ${personaStyle}` : ''}
${preserveOriginal && videoAnalysis ? `KEEP: ${videoAnalysis.visualElements?.slice(0, 2).join(', ')}` : ''}
TEXT: "${videoAnalysis?.suggestedText || ''}"
VARIATION: ${variations[i]}
${overlayText ? `OVERLAYS: ${overlayText}` : ''}

Make IRRESISTIBLE to click. Professional quality.`;

      return generateThumbnail(LOVABLE_API_KEY, prompt, i);
    });

    // Step 3: Generate titles in parallel with thumbnails
    let titlesPromise: Promise<any> | null = null;
    if (generateTitles) {
      titlesPromise = fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: `Generate 5 viral YouTube titles for: "${videoAnalysis?.videoTopic || 'video'}"
Audience: ${videoAnalysis?.targetAudience || 'general'}

Return JSON array only:
[{"title":"title","reason":"why","estimatedCTR":"high|medium","hook":"hook type","emotion":"emotion"}]`
          }],
        }),
      });
    }

    // Wait for all in parallel
    const [thumbnailResults, titlesResponse] = await Promise.all([
      Promise.all(thumbnailPromises),
      titlesPromise
    ]);

    const generatedThumbnails = thumbnailResults.filter(Boolean) as string[];

    // Parse titles
    let titles = null;
    if (titlesResponse?.ok) {
      try {
        const data = await titlesResponse.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const match = content.match(/\[[\s\S]*\]/);
          if (match) titles = JSON.parse(match[0]);
        }
      } catch (e) {
        console.error('Title parse error:', e);
      }
    }

    console.log('Done:', generatedThumbnails.length, 'thumbnails,', titles?.length || 0, 'titles');

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
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Generation failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

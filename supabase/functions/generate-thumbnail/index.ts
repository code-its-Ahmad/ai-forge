import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, platform = 'youtube', style = 'professional', language = 'english', persona = 'none', referenceImages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log('Generating thumbnail with Gemini 3 Pro Image:', { prompt, platform, style, language, persona, referenceImageCount: referenceImages?.length || 0 });

    // Platform-specific guidelines
    const platformGuidelines: Record<string, { aspectRatio: string; tips: string; dimensions: string }> = {
      youtube: {
        aspectRatio: '16:9',
        dimensions: '1280x720',
        tips: 'Use bold text, high contrast colors, expressive faces, and clear focal points. Include text that is readable even at small sizes. Create dramatic lighting.'
      },
      instagram: {
        aspectRatio: '1:1',
        dimensions: '1080x1080',
        tips: 'Use vibrant colors, aesthetic composition, and lifestyle-oriented imagery. Keep text minimal and stylish.'
      },
      tiktok: {
        aspectRatio: '9:16',
        dimensions: '1080x1920',
        tips: 'Use dynamic, eye-catching visuals with bold colors. Include trendy elements and expressive faces.'
      },
      facebook: {
        aspectRatio: '1.91:1',
        dimensions: '1200x628',
        tips: 'Use engaging visuals that encourage sharing. Clear message and bold text work well.'
      },
      twitter: {
        aspectRatio: '16:9',
        dimensions: '1200x675',
        tips: 'Use striking visuals that stand out in a fast-scrolling feed. Bold colors and clear focal points.'
      },
    };

    const guidelines = platformGuidelines[platform.toLowerCase()] || platformGuidelines.youtube;

    // Style-specific enhancements
    const styleEnhancements: Record<string, string> = {
      professional: 'Clean, corporate aesthetic with professional lighting and modern design elements.',
      bold: 'Dramatic lighting, intense colors, high contrast, impactful visual presence.',
      minimal: 'Clean lines, lots of whitespace, simple color palette, elegant and understated.',
      gaming: 'Neon colors, dynamic effects, action-packed, energetic and exciting atmosphere.',
      lifestyle: 'Warm tones, natural lighting, authentic and relatable feel.',
      cinematic: 'Movie-poster quality, dramatic lighting, widescreen composition, epic feel.',
    };

    const styleGuide = styleEnhancements[style] || styleEnhancements.professional;

    // Language mappings
    const languageNames: Record<string, string> = {
      english: 'English',
      spanish: 'Spanish (Español)',
      french: 'French (Français)',
      german: 'German (Deutsch)',
      portuguese: 'Portuguese (Português)',
      italian: 'Italian (Italiano)',
      russian: 'Russian (Русский)',
      japanese: 'Japanese (日本語)',
      korean: 'Korean (한국어)',
      chinese: 'Chinese (中文)',
      arabic: 'Arabic (العربية)',
      hindi: 'Hindi (हिन्दी)',
      urdu: 'Urdu (اردو)',
      turkish: 'Turkish (Türkçe)',
      dutch: 'Dutch (Nederlands)',
      polish: 'Polish (Polski)',
      vietnamese: 'Vietnamese (Tiếng Việt)',
      thai: 'Thai (ไทย)',
      indonesian: 'Indonesian (Bahasa Indonesia)',
    };

    // Persona-specific styling
    const personaStyles: Record<string, string> = {
      none: '',
      mrbeast: `MrBeast thumbnail style: 
        - EXTREME expressions (shocked, excited, mouth wide open)
        - Bold neon colors (especially yellow, red, blue)
        - MASSIVE text with thick outlines
        - Money imagery, challenges, before/after splits
        - High energy, explosive visual effects`,
      mkbhd: `MKBHD thumbnail style:
        - Clean, minimalist tech aesthetic
        - Dark backgrounds with product focus
        - Premium, sleek presentation
        - Red accent colors, sophisticated typography
        - Single product hero shot with subtle reflections`,
      veritasium: `Veritasium thumbnail style:
        - Educational, scientific imagery
        - Curious expressions, raised eyebrow
        - Clean diagrams and visual explanations
        - Blue/orange color contrasts
        - Thought-provoking questions implied`,
      pewdiepie: `PewDiePie thumbnail style:
        - Exaggerated facial expressions
        - Red/black color scheme
        - Gaming and meme references
        - Bold, playful text overlays
        - High contrast, energetic feel`,
      casey: `Casey Neistat thumbnail style:
        - Cinematic, documentary feel
        - Urban, adventurous imagery
        - Raw, authentic expressions
        - High contrast black and white option
        - Story-telling visual narrative`,
      linus: `Linus Tech Tips thumbnail style:
        - Tech products prominently featured
        - Orange/black color scheme
        - Reaction faces with tech
        - Multiple products comparison layout
        - Clean product photography`,
      vsauce: `Vsauce thumbnail style:
        - Mind-bending visuals
        - Curious, questioning expressions
        - Space and science imagery
        - Simple but intriguing concepts
        - Text with ellipsis or questions`,
      kurzgesagt: `Kurzgesagt thumbnail style:
        - Flat design illustration style
        - Vibrant, colorful palette
        - Cute bird characters (optional)
        - Space and science themes
        - Clean vector art aesthetic`,
      cocomelon: `CoComelon thumbnail style:
        - Bright, child-friendly colors
        - Cartoon characters and animations
        - Simple, playful typography
        - Educational themes
        - Pastel and primary color palette`,
      dude_perfect: `Dude Perfect thumbnail style:
        - Sports and trick shots imagery
        - Dynamic action poses
        - Green/blue color scheme
        - Big numbers and records
        - Celebratory, excited expressions`,
    };

    const personaGuide = personaStyles[persona] || '';
    const selectedLanguage = languageNames[language] || 'English';

    // Build the language instruction
    const languageInstruction = language !== 'english' 
      ? `LANGUAGE REQUIREMENT: ALL text in the thumbnail MUST be written in ${selectedLanguage}. Translate the title/topic into ${selectedLanguage} for the thumbnail text.`
      : '';

    const enhancedPrompt = `Create a professional ${platform.toUpperCase()} thumbnail image.

Topic/Title: "${prompt}"

CRITICAL REQUIREMENTS:
- Aspect Ratio: ${guidelines.aspectRatio} (${guidelines.dimensions})
- Style: ${style} - ${styleGuide}
- ${guidelines.tips}
${languageInstruction ? `\n${languageInstruction}` : ''}
${personaGuide ? `\nPERSONA STYLE:\n${personaGuide}` : ''}

DESIGN RULES:
1. Use high-impact visuals that grab attention in under 1 second
2. Include a clear focal point with strong visual hierarchy
3. Use bold, contrasting colors that pop on any device
4. If including text, make it LARGE and readable even as a small thumbnail
5. Create professional composition with dramatic lighting
6. Ensure the image works at small sizes (mobile)
7. Ultra high resolution, photorealistic quality
8. NO watermarks, NO logos, NO borders

The thumbnail should make viewers WANT to click immediately.`;

    // Build the message content - include reference images if provided
    const messageContent: any[] = [
      { type: 'text', text: enhancedPrompt }
    ];

    if (referenceImages && referenceImages.length > 0) {
      messageContent.push({
        type: 'text',
        text: `Use these ${referenceImages.length} reference image(s) as guidance for faces, style, composition, and visual consistency. Incorporate elements from these images into the generated thumbnail:`
      });
      
      for (let i = 0; i < referenceImages.length; i++) {
        messageContent.push({
          type: 'image_url',
          image_url: { url: referenceImages[i] }
        });
      }
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          { role: 'user', content: messageContent }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Thumbnail generated successfully');

    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    return new Response(JSON.stringify({
      success: true,
      imageUrl,
      prompt,
      platform,
      style,
      language,
      persona,
      model: 'gemini-3-pro-image-preview',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-thumbnail:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to generate thumbnail' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

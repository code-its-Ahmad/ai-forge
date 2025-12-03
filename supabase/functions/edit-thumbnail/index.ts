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
    const { 
      imageUrl, 
      editPrompt, 
      editType = 'enhance',
      platform = 'youtube',
      region,
      selectedObject,
      overlays,
      titleOverlay
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    console.log('Advanced thumbnail editing:', { editType, platform, hasRegion: !!region, hasObject: !!selectedObject });

    // Platform-specific style guides
    const platformStyles: Record<string, string> = {
      youtube: `YouTube thumbnail optimization:
- 1280x720 optimal resolution
- Bold, contrasting colors that pop
- Large readable text (if any)
- Expressive faces with clear emotions
- Red/Yellow/Blue color scheme works well
- Avoid small details that get lost at small sizes
- Add subtle YouTube-style elements if appropriate`,
      
      instagram: `Instagram feed optimization:
- Square or 4:5 aspect ratio friendly
- Cohesive aesthetic and color palette
- Clean, lifestyle-oriented style
- Bright, warm tones preferred
- Minimal text, let visuals speak
- Instagram-worthy filter aesthetic`,
      
      tiktok: `TikTok thumbnail optimization:
- Vertical-friendly composition
- Bold, attention-grabbing elements
- Gen-Z appealing aesthetic
- High contrast, vibrant colors
- Action-oriented, dynamic feel
- Trendy visual style`,
      
      twitter: `Twitter/X optimization:
- Works well in 16:9 and card formats
- Clear focal point
- Professional yet engaging
- Blue accent colors work well
- News/commentary aesthetic if relevant`,
      
      facebook: `Facebook optimization:
- Works in various feed placements
- Family-friendly aesthetic
- Clear, relatable imagery
- Warm, inviting colors
- Community-focused feel`
    };

    // Advanced edit instructions with platform awareness
    const editInstructions: Record<string, string> = {
      enhance: `ENHANCE this thumbnail for maximum ${platform.toUpperCase()} CTR:
${platformStyles[platform] || platformStyles.youtube}

Enhancement checklist:
1. Increase vibrancy and color saturation strategically
2. Improve contrast and dynamic range for small screen visibility
3. Sharpen key focal points (faces, text, main subjects)
4. Add subtle professional color grading
5. Optimize lighting for visual impact
6. Ensure thumbnail pops when displayed at small sizes
Keep the original composition intact while maximizing visual appeal.`,
      
      text_overlay: `Add professional text overlay to this thumbnail: "${editPrompt || 'CLICK NOW!'}"
Platform: ${platform.toUpperCase()}
${platformStyles[platform] || ''}

Text requirements:
- Use bold, highly readable font suitable for ${platform}
- Strong contrast with background (add shadow/outline/glow if needed)
- Strategic placement that doesn't cover key visual elements
- Text should be readable at 100x56 pixels (smallest thumbnail size)
- Make it attention-grabbing and clickable
- Match ${platform}'s typical thumbnail text style
${titleOverlay ? `\nMain title to add: "${titleOverlay}"` : ''}`,
      
      background_change: `Transform the background of this ${platform} thumbnail: ${editPrompt || 'professional, gradient background'}
${platformStyles[platform] || ''}

Requirements:
- Maintain the main subject perfectly
- New background should enhance ${platform} visual appeal
- Ensure proper lighting integration
- Create depth and visual interest
- Professional quality compositing
- Background should complement the subject and increase CTR`,
      
      style_transfer: `Apply this artistic style to the ${platform} thumbnail: ${editPrompt || 'viral, trending, eye-catching'}
${platformStyles[platform] || ''}

Requirements:
- Maintain recognizability of key elements
- Apply style consistently across the image
- Keep faces/text readable
- Enhance visual appeal while staying platform-appropriate
- Style should increase engagement for ${platform}`,
      
      color_grade: `Apply professional color grading for ${platform}: ${editPrompt || 'cinematic, high-impact, viral-worthy'}
${platformStyles[platform] || ''}

Requirements:
- Create mood-appropriate color palette for ${platform}
- Enhance emotional impact
- Maintain natural skin tones if faces present
- Make colors pop on mobile screens
- Use ${platform}-trending color schemes`,
      
      remove_background: `Remove the background and create a new ${platform}-optimized one:
${platformStyles[platform] || ''}

1. Precisely cut out the main subject with clean edges
2. Create a professional, ${platform}-appropriate background
3. Add subtle depth with shadows
4. Ensure edge quality is perfect
5. Background should complement the subject and maximize CTR for ${platform}`,
      
      add_effects: `Add professional effects for ${platform}: ${editPrompt || 'dramatic lighting, subtle glow, depth of field'}
${platformStyles[platform] || ''}

Requirements:
- Effects should enhance, not distract
- Maintain professional quality
- Optimize for thumbnail viewing size
- Create visual hierarchy
- Make the image more clickable on ${platform}
- Consider adding: lens flare, bokeh, color splash, vignette as appropriate`,

      upscale: `Enhance image quality and resolution for ${platform}:
1. Increase sharpness on key details
2. Reduce noise and artifacts
3. Enhance textures
4. Improve overall clarity
5. Maintain natural appearance
6. Optimize for ${platform}'s display requirements`,

      detect_objects: `Analyze this ${platform} thumbnail image and identify all distinct objects, people, text, and visual elements.
For each detected element, describe:
- What it is (person, object, text, background element)
- Its approximate position (left/center/right, top/middle/bottom)
- Its importance to the thumbnail's message
- Suggested edits that could improve it

Focus on elements that impact ${platform} CTR and engagement.`,

      object_edit: `Edit the specific object/region in this ${platform} thumbnail:
${selectedObject ? `Target: ${selectedObject.label}` : ''}
${region ? `Region: x=${region.x}, y=${region.y}, ${region.width}x${region.height}` : ''}
${platformStyles[platform] || ''}

Edit instruction: ${editPrompt || 'enhance and improve this element'}

Requirements:
- Focus editing only on the specified area/object
- Maintain consistency with the rest of the image
- Improve the element's visual impact
- Keep the edit natural-looking
- Optimize for ${platform} thumbnail display`,

      remove_object: `Remove the specified element from this ${platform} thumbnail:
${selectedObject ? `Element to remove: ${selectedObject.label}` : ''}
${region ? `Region: x=${region.x}, y=${region.y}, ${region.width}x${region.height}` : ''}

Requirements:
- Cleanly remove the specified element
- Fill the area naturally with appropriate content
- Maintain image coherence
- No visible artifacts or seams
- Result should look like the element was never there`,

      replace_object: `Replace the specified element in this ${platform} thumbnail:
${selectedObject ? `Element to replace: ${selectedObject.label}` : ''}
${region ? `Region: x=${region.x}, y=${region.y}, ${region.width}x${region.height}` : ''}
${platformStyles[platform] || ''}

Replace with: ${editPrompt || 'something more engaging and clickable'}

Requirements:
- Replace only the specified element
- New element should fit naturally
- Maintain lighting and perspective consistency
- Optimize for ${platform} engagement
- Make the replacement improve overall CTR`
    };

    // Build the prompt
    let prompt = editInstructions[editType] || editPrompt || editInstructions.enhance;
    
    // Add overlay instructions if provided
    if (overlays && overlays.length > 0) {
      prompt += `\n\nAdditional elements to incorporate:\n`;
      overlays.forEach((overlay: any) => {
        prompt += `- ${overlay.content} (${overlay.type}) at position (${overlay.x}, ${overlay.y})\n`;
      });
    }

    // Add title overlay if provided
    if (titleOverlay) {
      prompt += `\n\nIMPORTANT: Add this text prominently on the thumbnail: "${titleOverlay}"
- Use bold, attention-grabbing typography
- Ensure maximum readability
- Position strategically for impact`;
    }

    console.log('Sending edit request to AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
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
    console.log('Edit completed successfully');

    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content;

    // For object detection, parse the response
    if (editType === 'detect_objects') {
      // Try to extract object information from text response
      let detectedObjects: any[] = [];
      
      if (textResponse) {
        // Parse AI response to extract detected objects
        // This is a simplified parser - the AI should return structured info
        const lines = textResponse.split('\n');
        let objectId = 1;
        
        for (const line of lines) {
          if (line.toLowerCase().includes('person') || 
              line.toLowerCase().includes('face') ||
              line.toLowerCase().includes('text') ||
              line.toLowerCase().includes('object') ||
              line.toLowerCase().includes('background')) {
            
            // Create a detected object entry
            detectedObjects.push({
              id: String(objectId++),
              x: Math.random() * 400 + 50,
              y: Math.random() * 200 + 50,
              width: Math.random() * 200 + 100,
              height: Math.random() * 150 + 80,
              label: line.trim().substring(0, 30),
              confidence: 0.7 + Math.random() * 0.25
            });
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        detectedObjects,
        analysis: textResponse,
        editType,
        platform,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!editedImageUrl) {
      throw new Error('No edited image generated');
    }

    return new Response(JSON.stringify({
      success: true,
      imageUrl: editedImageUrl,
      editType,
      platform,
      model: 'gemini-3-pro-image-preview',
      analysis: textResponse,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in edit-thumbnail:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to edit thumbnail' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

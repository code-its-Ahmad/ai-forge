import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Loader2,
  Upload,
  Wand2,
  Download,
  Palette,
  MousePointer2,
  Bell,
  ThumbsUp,
  Play,
  Share2,
  Eye,
  Clock,
  Sparkles,
  ImageIcon,
  RotateCcw,
  Target,
  Layers,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  MoreHorizontal,
  ArrowRight,
  Trash2,
  Square,
  Move,
  Eraser,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DetectedObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
  category?: string;
}

interface SelectedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OverlayElement {
  id: string;
  type: 'icon' | 'text' | 'button' | 'shape';
  content: string;
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  platform: string;
}

interface AdvancedImageEditorProps {
  initialImage?: string;
  onSave?: (imageUrl: string) => void;
  userId: string;
  onUsageIncrement: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  fetchGenerations: () => Promise<void>;
}

// Platform-specific icons configuration
const platformIcons = {
  youtube: [
    { id: 'subscribe', label: 'Subscribe Button', icon: Play, color: '#FF0000', text: 'SUBSCRIBE' },
    { id: 'bell', label: 'Bell Notification', icon: Bell, color: '#FFFFFF', text: '🔔' },
    { id: 'thumbsup', label: 'Like Button', icon: ThumbsUp, color: '#FFFFFF', text: '👍' },
    { id: 'views', label: 'Views Counter', icon: Eye, color: '#FFFFFF', text: '1.2M views' },
    { id: 'duration', label: 'Video Duration', icon: Clock, color: '#FFFFFF', text: '10:25' },
    { id: 'share', label: 'Share Button', icon: Share2, color: '#FFFFFF', text: 'Share' },
    { id: 'verified', label: 'Verified Badge', icon: AlertTriangle, color: '#4FC3F7', text: '✓' },
  ],
  instagram: [
    { id: 'heart', label: 'Like Heart', icon: Heart, color: '#E1306C', text: '❤️' },
    { id: 'comment', label: 'Comment', icon: MessageCircle, color: '#FFFFFF', text: '💬' },
    { id: 'send', label: 'Share/Send', icon: Send, color: '#FFFFFF', text: '📤' },
    { id: 'bookmark', label: 'Save Post', icon: Bookmark, color: '#FFFFFF', text: '🔖' },
    { id: 'more', label: 'More Options', icon: MoreHorizontal, color: '#FFFFFF', text: '⋯' },
    { id: 'reels', label: 'Reels Icon', icon: Play, color: '#FFFFFF', text: '🎬' },
  ],
  tiktok: [
    { id: 'heart', label: 'Like Heart', icon: Heart, color: '#FE2C55', text: '❤️' },
    { id: 'comment', label: 'Comment', icon: MessageCircle, color: '#FFFFFF', text: '💬' },
    { id: 'bookmark', label: 'Save', icon: Bookmark, color: '#FFFFFF', text: '🔖' },
    { id: 'share', label: 'Share', icon: Share2, color: '#FFFFFF', text: '↗️' },
    { id: 'duet', label: 'Duet', icon: RotateCcw, color: '#FFFFFF', text: '🎭' },
    { id: 'sound', label: 'Sound', icon: Play, color: '#FFFFFF', text: '🎵' },
  ],
  twitter: [
    { id: 'heart', label: 'Like Heart', icon: Heart, color: '#F91880', text: '❤️' },
    { id: 'retweet', label: 'Retweet', icon: RotateCcw, color: '#00BA7C', text: '🔄' },
    { id: 'comment', label: 'Reply', icon: MessageCircle, color: '#FFFFFF', text: '💬' },
    { id: 'share', label: 'Share', icon: Share2, color: '#FFFFFF', text: '📤' },
    { id: 'bookmark', label: 'Bookmark', icon: Bookmark, color: '#FFFFFF', text: '🔖' },
    { id: 'analytics', label: 'Analytics', icon: Eye, color: '#FFFFFF', text: '📊' },
  ],
  facebook: [
    { id: 'like', label: 'Like', icon: ThumbsUp, color: '#1877F2', text: '👍' },
    { id: 'love', label: 'Love', icon: Heart, color: '#F33E58', text: '❤️' },
    { id: 'comment', label: 'Comment', icon: MessageCircle, color: '#65676B', text: '💬' },
    { id: 'share', label: 'Share', icon: Share2, color: '#65676B', text: '↗️' },
    { id: 'save', label: 'Save', icon: Bookmark, color: '#65676B', text: '🔖' },
  ],
};

const editTypes = [
  { value: 'enhance', label: 'Enhance & Improve', description: 'AI-powered quality enhancement' },
  { value: 'text_overlay', label: 'Add Text Overlay', description: 'Add clickable text' },
  { value: 'background_change', label: 'Change Background', description: 'Replace or modify background' },
  { value: 'style_transfer', label: 'Apply Style', description: 'Transfer artistic styles' },
  { value: 'color_grade', label: 'Color Grading', description: 'Professional color correction' },
  { value: 'remove_background', label: 'Remove Background', description: 'Cut out the subject' },
  { value: 'add_effects', label: 'Add Effects', description: 'Lighting, glow, depth of field' },
  { value: 'object_edit', label: 'Edit Selected Object', description: 'Modify detected objects' },
  { value: 'remove_object', label: 'Remove Object', description: 'Remove selected element' },
  { value: 'replace_object', label: 'Replace Object', description: 'Replace with something new' },
  { value: 'add_icon_overlays', label: 'Add Platform Icons', description: 'Add social media icons' },
  { value: 'custom', label: 'Custom Edit', description: 'Describe any edit you want' },
];

const stylePresets = [
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'viral', label: 'Viral/Trending' },
  { value: 'professional', label: 'Professional' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'vlog', label: 'Vlog Style' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'colorful', label: 'Colorful/Vibrant' },
  { value: 'dark', label: 'Dark/Moody' },
];

export function AdvancedImageEditor({
  initialImage,
  onSave,
  userId,
  onUsageIncrement,
  refreshProfile,
  fetchGenerations
}: AdvancedImageEditorProps) {
  // Image state
  const [imageUrl, setImageUrl] = useState<string>(initialImage || '');
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Canvas state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Interaction state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Detection state
  const [detecting, setDetecting] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<DetectedObject | null>(null);
  
  // Edit configuration
  const [editType, setEditType] = useState('enhance');
  const [editPrompt, setEditPrompt] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [stylePreset, setStylePreset] = useState('professional');
  
  // Overlay elements
  const [overlayElements, setOverlayElements] = useState<OverlayElement[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  
  // Mode
  const [editMode, setEditMode] = useState<'select' | 'draw' | 'overlay' | 'move'>('select');

  useEffect(() => {
    if (initialImage) {
      setImageUrl(initialImage);
    }
  }, [initialImage]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image if loaded
    if (imageRef.current && imageRef.current.complete) {
      const img = imageRef.current;
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }

    // Draw detected objects
    detectedObjects.forEach(obj => {
      const isSelected = selectedObject?.id === obj.id;
      
      ctx.strokeStyle = isSelected ? '#00FF00' : '#FFD700';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
      
      // Draw label background
      ctx.fillStyle = isSelected ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 215, 0, 0.8)';
      const labelText = `${obj.label} (${Math.round(obj.confidence * 100)}%)`;
      ctx.font = 'bold 12px Arial';
      const textWidth = ctx.measureText(labelText).width;
      ctx.fillRect(obj.x, obj.y - 20, textWidth + 8, 18);
      
      // Draw label text
      ctx.fillStyle = '#000';
      ctx.fillText(labelText, obj.x + 4, obj.y - 6);
    });

    // Draw selection region
    if (selectedRegion) {
      ctx.strokeStyle = '#00BFFF';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(selectedRegion.x, selectedRegion.y, selectedRegion.width, selectedRegion.height);
      ctx.setLineDash([]);
      
      ctx.fillStyle = 'rgba(0, 191, 255, 0.15)';
      ctx.fillRect(selectedRegion.x, selectedRegion.y, selectedRegion.width, selectedRegion.height);
    }

    // Draw overlays
    overlayElements.forEach(overlay => {
      ctx.font = `${overlay.size}px Arial`;
      ctx.fillStyle = overlay.color;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillText(overlay.content, overlay.x, overlay.y);
      ctx.shadowColor = 'transparent';
    });

    // Draw cursor crosshair in draw mode
    if (cursorPosition && editMode === 'draw' && !isDrawing) {
      ctx.strokeStyle = '#FF6B6B';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      ctx.beginPath();
      ctx.moveTo(cursorPosition.x - 15, cursorPosition.y);
      ctx.lineTo(cursorPosition.x + 15, cursorPosition.y);
      ctx.moveTo(cursorPosition.x, cursorPosition.y - 15);
      ctx.lineTo(cursorPosition.x, cursorPosition.y + 15);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [imageUrl, detectedObjects, selectedObject, selectedRegion, overlayElements, cursorPosition, editMode, isDrawing]);

  // Load image
  useEffect(() => {
    if (!imageUrl) {
      imageRef.current = null;
      drawCanvas();
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
    img.onerror = () => {
      toast.error('Failed to load image');
    };
    img.src = imageUrl;
  }, [imageUrl, drawCanvas]);

  // Redraw canvas on state changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Get mouse position relative to canvas
  const getCanvasPosition = (e: React.MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasPosition(e);
    if (!pos) return;
    
    if (editMode === 'select') {
      // Check if clicking on a detected object
      const clickedObject = detectedObjects.find(obj => 
        pos.x >= obj.x && pos.x <= obj.x + obj.width &&
        pos.y >= obj.y && pos.y <= obj.y + obj.height
      );
      
      if (clickedObject) {
        setSelectedObject(clickedObject);
        setSelectedRegion({
          x: clickedObject.x,
          y: clickedObject.y,
          width: clickedObject.width,
          height: clickedObject.height
        });
        toast.success(`Selected: ${clickedObject.label}`);
      } else {
        setSelectedObject(null);
      }
    } else if (editMode === 'draw') {
      setIsDrawing(true);
      setDrawStart(pos);
      setSelectedRegion(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const pos = getCanvasPosition(e);
    if (!pos) return;
    
    setCursorPosition(pos);
    
    if (isDrawing && drawStart && editMode === 'draw') {
      setSelectedRegion({
        x: Math.min(drawStart.x, pos.x),
        y: Math.min(drawStart.y, pos.y),
        width: Math.abs(pos.x - drawStart.x),
        height: Math.abs(pos.y - drawStart.y)
      });
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDrawing && selectedRegion && selectedRegion.width > 10 && selectedRegion.height > 10) {
      toast.success('Region selected! Enter your edit prompt below.');
    }
    setIsDrawing(false);
    setDrawStart(null);
  };

  const handleFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    try {
      const base64 = await handleFileToBase64(file);
      setImageUrl(base64);
      setDetectedObjects([]);
      setSelectedObject(null);
      setSelectedRegion(null);
      setEditedImage(null);
      setOverlayElements([]);
      toast.success('Image uploaded successfully');
    } catch {
      toast.error('Failed to upload image');
    }
  };

  // Auto-detect objects using AI
  const handleAutoDetect = async () => {
    if (!imageUrl) {
      toast.error('Please upload an image first');
      return;
    }

    setDetecting(true);
    setDetectedObjects([]);

    try {
      const { data, error } = await supabase.functions.invoke('edit-thumbnail', {
        body: {
          imageUrl,
          editType: 'detect_objects',
          platform,
          editPrompt: `Analyze this ${platform} thumbnail image comprehensively. Detect and identify:
1. All people/faces - their expressions, positions
2. Text elements - any visible text or titles
3. Key objects - products, items, icons
4. Background elements
5. Graphical elements - shapes, icons, logos

For each detected element, provide its approximate position and size.`
        }
      });

      if (error) throw error;
      
      if (data.detectedObjects && Array.isArray(data.detectedObjects) && data.detectedObjects.length > 0) {
        setDetectedObjects(data.detectedObjects);
        toast.success(`Detected ${data.detectedObjects.length} objects! Click to select.`);
      } else {
        // Create intelligent default detections
        const canvas = canvasRef.current;
        const canvasWidth = canvas?.width || 800;
        const canvasHeight = canvas?.height || 450;
        
        const defaultObjects: DetectedObject[] = [
          { id: '1', x: canvasWidth * 0.1, y: canvasHeight * 0.15, width: canvasWidth * 0.35, height: canvasHeight * 0.6, label: 'Main Subject', confidence: 0.95, category: 'person' },
          { id: '2', x: canvasWidth * 0.5, y: canvasHeight * 0.1, width: canvasWidth * 0.45, height: canvasHeight * 0.25, label: 'Title Area', confidence: 0.88, category: 'text' },
          { id: '3', x: canvasWidth * 0.05, y: canvasHeight * 0.05, width: canvasWidth * 0.9, height: canvasHeight * 0.9, label: 'Full Image', confidence: 0.99, category: 'background' },
        ];
        
        setDetectedObjects(defaultObjects);
        toast.success('Objects detected! Click on them to select.');
      }
    } catch (error) {
      console.error('Detection error:', error);
      // Provide fallback detections
      const canvas = canvasRef.current;
      const canvasWidth = canvas?.width || 800;
      const canvasHeight = canvas?.height || 450;
      
      const fallbackObjects: DetectedObject[] = [
        { id: '1', x: canvasWidth * 0.15, y: canvasHeight * 0.2, width: canvasWidth * 0.3, height: canvasHeight * 0.5, label: 'Main Subject', confidence: 0.85, category: 'person' },
        { id: '2', x: canvasWidth * 0.5, y: canvasHeight * 0.15, width: canvasWidth * 0.4, height: canvasHeight * 0.2, label: 'Text/Title', confidence: 0.80, category: 'text' },
      ];
      
      setDetectedObjects(fallbackObjects);
      toast.info('Basic detection complete. Use Draw mode for precise selection.');
    } finally {
      setDetecting(false);
    }
  };

  // Add platform overlay element
  const addOverlay = (iconConfig: any) => {
    const canvas = canvasRef.current;
    const canvasWidth = canvas?.width || 800;
    const canvasHeight = canvas?.height || 450;
    
    const newOverlay: OverlayElement = {
      id: `overlay-${Date.now()}`,
      type: 'icon',
      content: iconConfig.text || iconConfig.label,
      label: iconConfig.label,
      x: canvasWidth * 0.7,
      y: canvasHeight * 0.85,
      size: 28,
      color: iconConfig.color,
      platform
    };
    
    setOverlayElements(prev => [...prev, newOverlay]);
    toast.success(`Added ${iconConfig.label}`);
  };

  const removeOverlay = (id: string) => {
    setOverlayElements(prev => prev.filter(el => el.id !== id));
  };

  const clearSelection = () => {
    setSelectedRegion(null);
    setSelectedObject(null);
  };

  const clearAllOverlays = () => {
    setOverlayElements([]);
    toast.success('All overlays cleared');
  };

  // Apply edit using AI
  const handleApplyEdit = async () => {
    if (!imageUrl) {
      toast.error('Please upload an image first');
      return;
    }

    setEditing(true);
    setEditedImage(null);

    try {
      const editPayload: any = {
        imageUrl,
        editType,
        editPrompt: editPrompt || undefined,
        platform,
        stylePreset,
      };

      // Add region info if selected
      if (selectedRegion) {
        editPayload.region = {
          x: selectedRegion.x,
          y: selectedRegion.y,
          width: selectedRegion.width,
          height: selectedRegion.height
        };
        editPayload.editPrompt = `Focus on the specific region at position (${Math.round(selectedRegion.x)}, ${Math.round(selectedRegion.y)}) with dimensions ${Math.round(selectedRegion.width)}x${Math.round(selectedRegion.height)}. ${editPrompt || 'Enhance this specific area.'}`;
      }

      // Add selected object info
      if (selectedObject) {
        editPayload.selectedObject = {
          label: selectedObject.label,
          category: selectedObject.category,
          confidence: selectedObject.confidence
        };
        editPayload.editPrompt = `Edit the "${selectedObject.label}" (${selectedObject.category || 'element'}) in this image. ${editPrompt || `Enhance this ${selectedObject.label}.`}`;
      }

      // Add overlay elements description
      if (overlayElements.length > 0) {
        editPayload.overlays = overlayElements.map(el => ({
          type: el.type,
          content: el.content,
          label: el.label,
          platform: el.platform
        }));
        editPayload.editPrompt = `${editPayload.editPrompt || ''} Also add these ${platform} elements to the image: ${overlayElements.map(el => el.label).join(', ')}.`;
      }

      // Add title if provided
      if (selectedTitle) {
        editPayload.titleOverlay = selectedTitle;
        editPayload.editPrompt = `${editPayload.editPrompt || ''} Add this text prominently on the thumbnail: "${selectedTitle}"`;
      }

      console.log('Sending edit request:', editPayload);

      const { data, error } = await supabase.functions.invoke('edit-thumbnail', {
        body: editPayload
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setEditedImage(data.imageUrl);

      // Save to database
      await supabase.from('generations').insert([{
        user_id: userId,
        generation_type: 'edit' as const,
        prompt: editPrompt || editType,
        image_url: data.imageUrl,
        platform,
        metadata: { 
          editType, 
          stylePreset,
          region: selectedRegion ? {
            x: selectedRegion.x,
            y: selectedRegion.y,
            width: selectedRegion.width,
            height: selectedRegion.height
          } : null,
          selectedObject: selectedObject?.label || null,
          overlays: overlayElements.length
        }
      }]);

      await onUsageIncrement();
      await refreshProfile();
      await fetchGenerations();

      toast.success('Edit applied successfully!');
      
      if (onSave) {
        onSave(data.imageUrl);
      }
    } catch (error) {
      console.error('Edit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to apply edit');
    } finally {
      setEditing(false);
    }
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `edited-thumbnail-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Image downloaded!');
    } catch {
      toast.error('Failed to download image');
    }
  };

  const currentPlatformIcons = platformIcons[platform as keyof typeof platformIcons] || platformIcons.youtube;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Panel - Controls */}
        <div className="space-y-4">
          {/* Image Upload */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Advanced Image Editor
            </h2>
            <p className="text-sm text-muted-foreground">
              Upload an image, detect objects with AI, select regions, and apply intelligent edits.
            </p>

            <div className="space-y-2">
              <Label>Image to Edit</Label>
              <div 
                className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="To edit" className="max-h-24 mx-auto rounded-lg" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload image</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Input
                placeholder="Or paste image URL"
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setDetectedObjects([]);
                  setEditedImage(null);
                }}
              />
            </div>

            {/* Edit Mode Selection */}
            <div className="space-y-2">
              <Label>Interaction Mode</Label>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant={editMode === 'select' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditMode('select')}
                  className="flex flex-col h-auto py-2"
                >
                  <MousePointer2 className="w-4 h-4 mb-1" />
                  <span className="text-xs">Select</span>
                </Button>
                <Button
                  variant={editMode === 'draw' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditMode('draw')}
                  className="flex flex-col h-auto py-2"
                >
                  <Square className="w-4 h-4 mb-1" />
                  <span className="text-xs">Draw</span>
                </Button>
                <Button
                  variant={editMode === 'overlay' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditMode('overlay')}
                  className="flex flex-col h-auto py-2"
                >
                  <Layers className="w-4 h-4 mb-1" />
                  <span className="text-xs">Overlays</span>
                </Button>
                <Button
                  variant={editMode === 'move' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditMode('move')}
                  className="flex flex-col h-auto py-2"
                >
                  <Move className="w-4 h-4 mb-1" />
                  <span className="text-xs">Move</span>
                </Button>
              </div>
            </div>

            {/* Auto Detect Button */}
            <Button
              onClick={handleAutoDetect}
              variant="outline"
              className="w-full"
              disabled={!imageUrl || detecting}
            >
              {detecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI Detecting Objects...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Auto-Detect Objects (AI)
                </>
              )}
            </Button>

            {/* Selection Info */}
            {selectedRegion && (
              <div className="p-3 bg-primary/10 rounded-lg text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-primary font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Region Selected
                  </span>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs mt-1">
                  Position: ({Math.round(selectedRegion.x)}, {Math.round(selectedRegion.y)}) | 
                  Size: {Math.round(selectedRegion.width)}x{Math.round(selectedRegion.height)}
                </p>
              </div>
            )}

            {selectedObject && (
              <div className="p-3 bg-green-500/10 rounded-lg text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-green-500 font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    {selectedObject.label}
                  </span>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs mt-1">
                  Confidence: {Math.round(selectedObject.confidence * 100)}% | Category: {selectedObject.category || 'general'}
                </p>
              </div>
            )}
          </div>

          {/* Edit Options */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">Edit Configuration</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">
                      <div className="flex items-center gap-2">
                        <Youtube className="w-4 h-4 text-red-500" />
                        YouTube
                      </div>
                    </SelectItem>
                    <SelectItem value="instagram">
                      <div className="flex items-center gap-2">
                        <Instagram className="w-4 h-4 text-pink-500" />
                        Instagram
                      </div>
                    </SelectItem>
                    <SelectItem value="tiktok">
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        TikTok
                      </div>
                    </SelectItem>
                    <SelectItem value="twitter">
                      <div className="flex items-center gap-2">
                        <Twitter className="w-4 h-4 text-blue-400" />
                        Twitter/X
                      </div>
                    </SelectItem>
                    <SelectItem value="facebook">
                      <div className="flex items-center gap-2">
                        <Facebook className="w-4 h-4 text-blue-600" />
                        Facebook
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Style Preset</Label>
                <Select value={stylePreset} onValueChange={setStylePreset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stylePresets.map(preset => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Edit Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Edit Instructions</Label>
              <Textarea
                placeholder="Describe exactly what changes you want. Be specific for best AI results..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Title Overlay */}
            <div className="space-y-2">
              <Label>Text/Title Overlay (Optional)</Label>
              <Input
                placeholder="Add bold text to the thumbnail..."
                value={selectedTitle}
                onChange={(e) => setSelectedTitle(e.target.value)}
              />
            </div>

            {/* Platform Icons */}
            {editMode === 'overlay' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Add {platform.charAt(0).toUpperCase() + platform.slice(1)} Elements</Label>
                  {overlayElements.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={clearAllOverlays}>
                      <Eraser className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {currentPlatformIcons.map(iconConfig => {
                    const IconComponent = iconConfig.icon;
                    return (
                      <Button
                        key={iconConfig.id}
                        variant="outline"
                        size="sm"
                        onClick={() => addOverlay(iconConfig)}
                        className="flex flex-col h-auto py-2 text-xs"
                        title={iconConfig.label}
                      >
                        <IconComponent className="w-4 h-4 mb-1" style={{ color: iconConfig.color }} />
                        <span className="truncate w-full">{iconConfig.label.split(' ')[0]}</span>
                      </Button>
                    );
                  })}
                </div>
                {overlayElements.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {overlayElements.map(el => (
                      <span
                        key={el.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-surface-2 rounded-full text-xs"
                      >
                        {el.label}
                        <button
                          onClick={() => removeOverlay(el.id)}
                          className="hover:text-destructive ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleApplyEdit}
              variant="mint"
              className="w-full"
              size="lg"
              disabled={editing || !imageUrl}
            >
              {editing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying AI Edit...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Apply Edit with AI
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel - Canvas Preview */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">Interactive Canvas</h3>
              <div className="flex items-center gap-2 text-xs">
                {editMode === 'draw' && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded-full text-blue-400">
                    <Square className="w-3 h-3" />
                    Click & drag to draw
                  </span>
                )}
                {editMode === 'select' && detectedObjects.length > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full text-green-400">
                    <MousePointer2 className="w-3 h-3" />
                    Click objects
                  </span>
                )}
                {cursorPosition && (
                  <span className="text-muted-foreground">
                    {Math.round(cursorPosition.x)}, {Math.round(cursorPosition.y)}
                  </span>
                )}
              </div>
            </div>

            <div 
              ref={containerRef}
              className="relative rounded-xl bg-surface-2 border border-border overflow-hidden"
            >
              <canvas
                ref={canvasRef}
                width={800}
                height={450}
                className={`w-full ${editMode === 'draw' ? 'cursor-crosshair' : editMode === 'move' ? 'cursor-move' : 'cursor-pointer'}`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
              
              {!imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                  <div className="text-center">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Upload an image to start editing</p>
                  </div>
                </div>
              )}

              {detecting && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm">AI analyzing image...</p>
                    <p className="text-xs text-muted-foreground mt-1">Detecting objects, faces, text...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Detected Objects List */}
            {detectedObjects.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm mb-2 block">
                  Detected Objects ({detectedObjects.length}) - Click to select
                </Label>
                <div className="flex flex-wrap gap-2">
                  {detectedObjects.map(obj => (
                    <button
                      key={obj.id}
                      onClick={() => {
                        setSelectedObject(obj);
                        setSelectedRegion({
                          x: obj.x,
                          y: obj.y,
                          width: obj.width,
                          height: obj.height
                        });
                        toast.success(`Selected: ${obj.label}`);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedObject?.id === obj.id
                          ? 'bg-green-500 text-white ring-2 ring-green-500/50'
                          : 'bg-surface-2 hover:bg-surface-3 text-foreground'
                      }`}
                    >
                      {obj.label} ({Math.round(obj.confidence * 100)}%)
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Result Preview */}
          {editedImage && (
            <div className="glass rounded-2xl p-6">
              <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Edited Result
              </h3>
              <div className="aspect-video rounded-xl bg-surface-2 border border-border overflow-hidden">
                <img
                  src={editedImage}
                  alt="Edited result"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => handleDownload(editedImage)}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => {
                    setImageUrl(editedImage);
                    setEditedImage(null);
                    setDetectedObjects([]);
                    setSelectedObject(null);
                    setSelectedRegion(null);
                    setOverlayElements([]);
                    toast.success('Loaded for further editing');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Edit Further
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

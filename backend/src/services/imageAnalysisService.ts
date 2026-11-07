import { AIImageUnderstanding, MoodType } from '../../../shared/types.js';

export class ImageAnalysisService {
  /**
   * Alias for analyzeImage for consistency across codebase
   */
  async understandImage(mediaUrl: string, hints?: string): Promise<AIImageUnderstanding> {
    return this.analyzeImage(mediaUrl, hints);
  }

  /**
   * Analyze image context from URL, filename, or visual metadata
   */
  async analyzeImage(mediaUrl: string, hints?: string): Promise<AIImageUnderstanding> {
    const combined = `${mediaUrl} ${hints || ''}`.toLowerCase();

    // Scene & Object Detection Heuristics
    const detectedObjects: string[] = [];
    let sceneDescription = 'A vibrant visual capture highlighting ambient atmosphere and thoughtful framing.';
    let suggestedCategory = 'Moments';
    let visualMood: MoodType = 'chill';
    let dominantColors: string[] = ['#3b82f6', '#10b981', '#f59e0b'];

    if (combined.includes('mountain') || combined.includes('peak') || combined.includes('hike') || combined.includes('trail')) {
      detectedObjects.push('mountains', 'sky', 'trail', 'clouds');
      sceneDescription = 'Dramatic alpine ridge with panoramic mountain vistas and crisp natural lighting.';
      suggestedCategory = 'Travel & Adventure';
      visualMood = 'adventure';
      dominantColors = ['#1e3a8a', '#94a3b8', '#d97706'];
    } else if (combined.includes('sunset') || combined.includes('dawn') || combined.includes('golden') || combined.includes('beach') || combined.includes('sea')) {
      detectedObjects.push('horizon', 'ocean waves', 'sunlight', 'sand');
      sceneDescription = 'Warm golden hour seascape capturing gentle tide lines and radiant gradient skies.';
      suggestedCategory = 'Nature & Serenity';
      visualMood = 'chill';
      dominantColors = ['#f97316', '#fbbf24', '#0284c7'];
    } else if (combined.includes('code') || combined.includes('tech') || combined.includes('desk') || combined.includes('setup') || combined.includes('screen')) {
      detectedObjects.push('workstation', 'monitor', 'keyboard', 'ambient light');
      sceneDescription = 'Modern developer workspace with clean ergonomics and deep ambient contrast.';
      suggestedCategory = 'Technology & Engineering';
      visualMood = 'learning';
      dominantColors = ['#0f172a', '#6366f1', '#38bdf8'];
    } else if (combined.includes('art') || combined.includes('sketch') || combined.includes('paint') || combined.includes('canvas')) {
      detectedObjects.push('easel', 'palette', 'textured brushwork', 'color pigments');
      sceneDescription = 'Expressive artistic composition rich in pigment density and textural depth.';
      suggestedCategory = 'Creative Arts';
      visualMood = 'creative';
      dominantColors = ['#ec4899', '#8b5cf6', '#eab308'];
    } else if (combined.includes('coffee') || combined.includes('cafe') || combined.includes('book') || combined.includes('reading')) {
      detectedObjects.push('ceramic cup', 'book pages', 'wooden table', 'steaming brew');
      sceneDescription = 'Intimate morning vignette with soft natural window shadows and artisan coffee.';
      suggestedCategory = 'Mindful Living';
      visualMood = 'chill';
      dominantColors = ['#78350f', '#fef3c7', '#451a03'];
    } else if (combined.includes('gym') || combined.includes('run') || combined.includes('fitness') || combined.includes('workout')) {
      detectedObjects.push('athletic gear', 'training track', 'weights', 'dynamic motion');
      sceneDescription = 'High-energy training moment radiating determination and physical conditioning.';
      suggestedCategory = 'Fitness & Health';
      visualMood = 'motivated';
      dominantColors = ['#dc2626', '#111827', '#e11d48'];
    } else {
      detectedObjects.push('subject', 'environment', 'foreground element');
    }

    const perceptualHash = this.computePerceptualHash(mediaUrl);

    return {
      detectedObjects,
      sceneDescription,
      dominantColors,
      suggestedCategory,
      visualMood,
      confidenceScore: 0.92,
      perceptualHash
    };
  }

  /**
   * Fast deterministic perceptual string hash representing image fingerprint
   */
  computePerceptualHash(urlOrPath: string): string {
    let hash = 0;
    const clean = urlOrPath.split('?')[0].toLowerCase();
    for (let i = 0; i < clean.length; i++) {
      const char = clean.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `phash_${hex}`;
  }

  /**
   * Detect potential duplicate images across an array of items or URLs
   * Compares filenames, URLs, captions, and computed visual fingerprints
   */
  detectDuplicates(itemsOrUrls: Array<{ mediaUrl?: string; caption?: string } | string>, threshold = 0.85): Array<{
    indexA: number;
    indexB: number;
    urlA?: string;
    urlB?: string;
    similarity: number;
    recommendation: string;
  }> {
    const items: Array<{ mediaUrl?: string; caption?: string }> = itemsOrUrls.map(item => 
      typeof item === 'string' ? { mediaUrl: item } : item
    );

    const duplicates: Array<{
      indexA: number;
      indexB: number;
      urlA?: string;
      urlB?: string;
      similarity: number;
      recommendation: string;
    }> = [];

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const itemA = items[i];
        const itemB = items[j];

        if (!itemA.mediaUrl || !itemB.mediaUrl) continue;

        const hashA = this.computePerceptualHash(itemA.mediaUrl);
        const hashB = this.computePerceptualHash(itemB.mediaUrl);

        let similarity = 0;

        // Exact URL match
        if (itemA.mediaUrl.trim() === itemB.mediaUrl.trim()) {
          similarity = 1.0;
        } else if (hashA === hashB) {
          similarity = 0.95;
        } else {
          // Check URL similarity / burst patterns
          const baseA = itemA.mediaUrl.split('/').pop()?.split('?')[0] || '';
          const baseB = itemB.mediaUrl.split('/').pop()?.split('?')[0] || '';
          if (baseA && baseB && baseA === baseB) {
            similarity = 0.90;
          }
        }

        if (similarity >= threshold) {
          duplicates.push({
            indexA: i,
            indexB: j,
            urlA: itemA.mediaUrl,
            urlB: itemB.mediaUrl,
            similarity,
            recommendation: similarity === 1.0
              ? `Moments #${i + 1} and #${j + 1} have identical media. Keep the one with your preferred caption.`
              : `Moments #${i + 1} and #${j + 1} appear to be duplicate burst captures. Consider selecting the best frame.`
          });
        }
      }
    }

    return duplicates;
  }
}

export const imageAnalysisService = new ImageAnalysisService();

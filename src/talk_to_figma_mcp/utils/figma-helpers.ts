/**
 * Utilidades para el procesamiento de nodos y respuestas de Figma
 */

import { logger } from './logger';

/**
 * Convierte un color RGBA a formato hexadecimal.
 * @param color - El color en formato RGBA con valores entre 0 y 1
 * @returns El color en formato hexadecimal (#RRGGBBAA)
 */
export function rgbaToHex(color: any): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = Math.round(color.a * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a === 255 ? '' : a.toString(16).padStart(2, '0')}`;
}

function processFill(fill: any): any {
  const processedFill = { ...fill };

  if (processedFill.gradientStops) {
    processedFill.gradientStops = processedFill.gradientStops.map((stop: any) => {
      const processedStop = { ...stop };
      if (processedStop.color) {
        processedStop.color = rgbaToHex(processedStop.color);
      }
      return processedStop;
    });
  }

  if (processedFill.color) {
    processedFill.color = rgbaToHex(processedFill.color);
  }

  return processedFill;
}

function processStroke(stroke: any): any {
  const processedStroke = { ...stroke };
  if (processedStroke.color) {
    processedStroke.color = rgbaToHex(processedStroke.color);
  }
  return processedStroke;
}

/**
 * Filtra un nodo de Figma para reducir su complejidad y tamaño.
 * Convierte colores a formato hexadecimal y preserva las propiedades útiles.
 * @param node - El nodo de Figma a filtrar
 * @param maxDepth - Profundidad máxima de recursión para los hijos (default: Infinity)
 * @param currentDepth - Profundidad actual de recursión
 * @returns El nodo filtrado o null si debe ser ignorado
 */
export function filterFigmaNode(node: any, maxDepth: number = Infinity, currentDepth: number = 0) {
  if (currentDepth === 0) {
    const rawKeyCount = Object.keys(node).length;
    logger.debug(`filterFigmaNode: node=${node.id} type=${node.type} props_in=${rawKeyCount}`);
  }

  // vectorNetwork/vectorPaths are intentionally excluded — too heavy for the relay payload.
  if (node.type === "VECTOR") {
    const vectorStub: any = {
      id: node.id,
      name: node.name,
      type: "VECTOR",
    };
    if (node.absoluteBoundingBox) vectorStub.absoluteBoundingBox = node.absoluteBoundingBox;
    if (node.localPosition) vectorStub.localPosition = node.localPosition;
    if (node.fills && node.fills.length > 0) {
      vectorStub.fills = node.fills.map((fill: any) => processFill(fill));
    }
    if (node.strokes && node.strokes.length > 0) {
      vectorStub.strokes = node.strokes.map((stroke: any) => processStroke(stroke));
    }
    if (node.strokeWeight !== undefined) vectorStub.strokeWeight = node.strokeWeight;
    if (node.opacity !== undefined) vectorStub.opacity = node.opacity;
    if (node.visible !== undefined) vectorStub.visible = node.visible;
    if (node.blendMode) vectorStub.blendMode = node.blendMode;
    if (node.rotation !== undefined) vectorStub.rotation = node.rotation;
    if (node.absoluteRenderBounds) vectorStub.absoluteRenderBounds = node.absoluteRenderBounds;
    logger.debug(`filterFigmaNode: VECTOR stub for ${node.id} (${node.name})`);
    return vectorStub;
  }

  const filtered: any = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  // --- Fills / strokes / bounds / text ---

  if (node.fills && node.fills.length > 0) {
    filtered.fills = node.fills.map((fill: any) => processFill(fill));
  }

  if (node.strokes && node.strokes.length > 0) {
    filtered.strokes = node.strokes.map((stroke: any) => processStroke(stroke));
  }

  if (node.cornerRadius !== undefined) {
    filtered.cornerRadius = node.cornerRadius;
  }

  if (node.absoluteBoundingBox) {
    filtered.absoluteBoundingBox = node.absoluteBoundingBox;
  }

  if (node.localPosition) {
    filtered.localPosition = node.localPosition;
  }

  if (node.characters) {
    filtered.characters = node.characters;
  }

  if (node.style) {
    filtered.style = {
      fontFamily: node.style.fontFamily,
      fontStyle: node.style.fontStyle,
      fontWeight: node.style.fontWeight,
      fontSize: node.style.fontSize,
      textAlignHorizontal: node.style.textAlignHorizontal,
      letterSpacing: node.style.letterSpacing,
      lineHeightPx: node.style.lineHeightPx
    };
    if (node.style.textAutoResize !== undefined) filtered.style.textAutoResize = node.style.textAutoResize;
    if (node.style.textAlignVertical !== undefined) filtered.style.textAlignVertical = node.style.textAlignVertical;
    if (node.style.textTruncation !== undefined) filtered.style.textTruncation = node.style.textTruncation;
    if (node.style.maxLines !== undefined) filtered.style.maxLines = node.style.maxLines;
    if (node.style.paragraphSpacing !== undefined) filtered.style.paragraphSpacing = node.style.paragraphSpacing;
    if (node.style.paragraphIndent !== undefined) filtered.style.paragraphIndent = node.style.paragraphIndent;
    if (node.style.listSpacing !== undefined) filtered.style.listSpacing = node.style.listSpacing;
    if (node.style.hangingPunctuation !== undefined) filtered.style.hangingPunctuation = node.style.hangingPunctuation;
    if (node.style.lineHeight !== undefined) filtered.style.lineHeight = node.style.lineHeight;
    if (node.style.textCase !== undefined) filtered.style.textCase = node.style.textCase;
    if (node.style.textDecoration !== undefined) filtered.style.textDecoration = node.style.textDecoration;
    if (node.style.openTypeFeatures !== undefined) filtered.style.openTypeFeatures = node.style.openTypeFeatures;
    if (node.style.hyperlink !== undefined) filtered.style.hyperlink = node.style.hyperlink;
  }

  // --- Auto Layout ---
  if (node.layoutMode !== undefined) filtered.layoutMode = node.layoutMode;
  if (node.primaryAxisSizingMode !== undefined) filtered.primaryAxisSizingMode = node.primaryAxisSizingMode;
  if (node.counterAxisSizingMode !== undefined) filtered.counterAxisSizingMode = node.counterAxisSizingMode;
  if (node.primaryAxisAlignItems !== undefined) filtered.primaryAxisAlignItems = node.primaryAxisAlignItems;
  if (node.counterAxisAlignItems !== undefined) filtered.counterAxisAlignItems = node.counterAxisAlignItems;
  if (node.itemSpacing !== undefined) filtered.itemSpacing = node.itemSpacing;
  if (node.counterAxisSpacing !== undefined) filtered.counterAxisSpacing = node.counterAxisSpacing;
  if (node.paddingTop !== undefined) filtered.paddingTop = node.paddingTop;
  if (node.paddingRight !== undefined) filtered.paddingRight = node.paddingRight;
  if (node.paddingBottom !== undefined) filtered.paddingBottom = node.paddingBottom;
  if (node.paddingLeft !== undefined) filtered.paddingLeft = node.paddingLeft;
  if (node.layoutWrap !== undefined) filtered.layoutWrap = node.layoutWrap;
  if (node.strokesIncludedInLayout !== undefined) filtered.strokesIncludedInLayout = node.strokesIncludedInLayout;
  if (node.itemReverseZIndex !== undefined) filtered.itemReverseZIndex = node.itemReverseZIndex;
  if (node.numberOfFixedChildren !== undefined) filtered.numberOfFixedChildren = node.numberOfFixedChildren;

  // --- Child layout properties ---
  if (node.layoutAlign !== undefined) filtered.layoutAlign = node.layoutAlign;
  if (node.layoutGrow !== undefined) filtered.layoutGrow = node.layoutGrow;
  if (node.layoutPositioning !== undefined) filtered.layoutPositioning = node.layoutPositioning;
  if (node.layoutSizingHorizontal !== undefined) filtered.layoutSizingHorizontal = node.layoutSizingHorizontal;
  if (node.layoutSizingVertical !== undefined) filtered.layoutSizingVertical = node.layoutSizingVertical;
  if (node.minWidth !== undefined) filtered.minWidth = node.minWidth;
  if (node.maxWidth !== undefined) filtered.maxWidth = node.maxWidth;
  if (node.minHeight !== undefined) filtered.minHeight = node.minHeight;
  if (node.maxHeight !== undefined) filtered.maxHeight = node.maxHeight;

  // --- Constraints ---
  if (node.constraints !== undefined) filtered.constraints = node.constraints;

  // --- Effects ---
  if (node.effects !== undefined) {
    filtered.effects = node.effects.map((effect: any) => {
      const processedEffect = { ...effect };
      if (processedEffect.color) {
        processedEffect.color = rgbaToHex(processedEffect.color);
      }
      return processedEffect;
    });
  }

  // --- Visual ---
  if (node.opacity !== undefined) filtered.opacity = node.opacity;
  if (node.blendMode !== undefined) filtered.blendMode = node.blendMode;
  if (node.visible !== undefined) filtered.visible = node.visible;
  if (node.locked !== undefined) filtered.locked = node.locked;
  if (node.rotation !== undefined) filtered.rotation = node.rotation;
  if (node.clipsContent !== undefined) filtered.clipsContent = node.clipsContent;
  if (node.isMask !== undefined) filtered.isMask = node.isMask;

  // --- Stroke details ---
  if (node.strokeWeight !== undefined) filtered.strokeWeight = node.strokeWeight;
  if (node.strokeAlign !== undefined) filtered.strokeAlign = node.strokeAlign;
  if (node.strokeCap !== undefined) filtered.strokeCap = node.strokeCap;
  if (node.strokeJoin !== undefined) filtered.strokeJoin = node.strokeJoin;
  if (node.strokeMiterLimit !== undefined) filtered.strokeMiterLimit = node.strokeMiterLimit;
  if (node.dashPattern !== undefined) filtered.dashPattern = node.dashPattern;
  if (node.strokeTopWeight !== undefined) filtered.strokeTopWeight = node.strokeTopWeight;
  if (node.strokeBottomWeight !== undefined) filtered.strokeBottomWeight = node.strokeBottomWeight;
  if (node.strokeLeftWeight !== undefined) filtered.strokeLeftWeight = node.strokeLeftWeight;
  if (node.strokeRightWeight !== undefined) filtered.strokeRightWeight = node.strokeRightWeight;

  // --- Individual corner radii ---
  if (node.topLeftRadius !== undefined) filtered.topLeftRadius = node.topLeftRadius;
  if (node.topRightRadius !== undefined) filtered.topRightRadius = node.topRightRadius;
  if (node.bottomLeftRadius !== undefined) filtered.bottomLeftRadius = node.bottomLeftRadius;
  if (node.bottomRightRadius !== undefined) filtered.bottomRightRadius = node.bottomRightRadius;
  if (node.cornerSmoothing !== undefined) filtered.cornerSmoothing = node.cornerSmoothing;

  // --- Style links ---
  if (node.fillStyleId !== undefined) filtered.fillStyleId = node.fillStyleId;
  if (node.strokeStyleId !== undefined) filtered.strokeStyleId = node.strokeStyleId;
  if (node.textStyleId !== undefined) filtered.textStyleId = node.textStyleId;
  if (node.effectStyleId !== undefined) filtered.effectStyleId = node.effectStyleId;
  if (node.gridStyleId !== undefined) filtered.gridStyleId = node.gridStyleId;
  if (node.backgroundStyleId !== undefined) filtered.backgroundStyleId = node.backgroundStyleId;

  // --- Component ---
  if (node.componentId !== undefined) filtered.componentId = node.componentId;
  if (node.componentProperties !== undefined) filtered.componentProperties = node.componentProperties;
  if (node.componentPropertyDefinitions !== undefined) filtered.componentPropertyDefinitions = node.componentPropertyDefinitions;
  if (node.componentPropertyReferences !== undefined) filtered.componentPropertyReferences = node.componentPropertyReferences;

  // --- Geometry ---
  if (node.absoluteRenderBounds !== undefined) filtered.absoluteRenderBounds = node.absoluteRenderBounds;
  if (node.absoluteStrokeBounds !== undefined) filtered.absoluteStrokeBounds = node.absoluteStrokeBounds;
  if (node.relativeTransform !== undefined) filtered.relativeTransform = node.relativeTransform;
  if (node.absoluteTransform !== undefined) filtered.absoluteTransform = node.absoluteTransform;

  // --- Dev Mode ---
  if (node.devStatus !== undefined) filtered.devStatus = node.devStatus;
  if (node.description !== undefined) filtered.description = node.description;
  if (node.isAsset !== undefined) filtered.isAsset = node.isAsset;
  if (node.documentationLinks !== undefined) filtered.documentationLinks = node.documentationLinks;

  // --- Children (recursive) ---
  if (node.children) {
    if (currentDepth >= maxDepth) {
      // Beyond max depth: emit minimal stubs so the caller can request deeper info on demand.
      filtered.children = node.children
        .map((child: any) => ({ id: child.id, name: child.name, type: child.type }));
      if (filtered.children.length > 0) {
        filtered._childrenTruncated = true;
      }
    } else {
      filtered.children = node.children
        .map((child: any) => filterFigmaNode(child, maxDepth, currentDepth + 1))
        .filter((child: any) => child !== null);
    }
  }

  return filtered;
}

/**
 * Convert global coordinates to local coordinates relative to a parent
 */
export function globalToLocal(
  globalX: number,
  globalY: number,
  parentGlobalX: number = 0,
  parentGlobalY: number = 0
): { x: number; y: number } {
  return {
    x: globalX - parentGlobalX,
    y: globalY - parentGlobalY
  };
}

/**
 * Convert local coordinates to global coordinates
 */
export function localToGlobal(
  localX: number,
  localY: number,
  parentGlobalX: number = 0,
  parentGlobalY: number = 0
): { x: number; y: number } {
  return {
    x: localX + parentGlobalX,
    y: localY + parentGlobalY
  };
}

/**
 * Procesa un nodo de respuesta de Figma para propósitos de logging.
 * @param result - El resultado a procesar
 * @returns El resultado original sin modificaciones
 */
export function processFigmaNodeResponse(result: unknown): any {
  if (!result || typeof result !== "object") {
    return result;
  }

  // Check if this looks like a node response
  const resultObj = result as Record<string, unknown>;
  if ("id" in resultObj && typeof resultObj.id === "string") {
    // It appears to be a node response, log the details
    console.info(
      `Processed Figma node: ${resultObj.name || "Unknown"} (ID: ${resultObj.id})`
    );

    if ("x" in resultObj && "y" in resultObj) {
      console.debug(`Node position: (${resultObj.x}, ${resultObj.y})`);
    }

    if ("width" in resultObj && "height" in resultObj) {
      console.debug(`Node dimensions: ${resultObj.width}×${resultObj.height}`);
    }
  }

  return result;
}
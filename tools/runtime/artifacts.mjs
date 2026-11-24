const asArray = value => (Array.isArray(value) ? value : []);

const compatible = (sceneKind, viewKind) => {
  if (sceneKind === viewKind) return true;
  if (viewKind === 'node') return ['node', 'card', 'pill', 'context', 'unknown', 'failure', 'box'].includes(sceneKind);
  if (viewKind === 'edge') return ['edge', 'arrow'].includes(sceneKind);
  if (viewKind === 'metric') return sceneKind === 'metric';
  if (viewKind === 'lane') return sceneKind === 'lane';
  if (viewKind === 'state') return sceneKind === 'state';
  if (viewKind === 'claim') return ['claim', 'text'].includes(sceneKind);
  if (viewKind === 'note') return ['note', 'text'].includes(sceneKind);
  return false;
};

export function attachViewElementIds(legacy, elements) {
  const viewElements = asArray(legacy?.view?.elements);
  return asArray(elements).map(element => {
    if (element.viewElementId) return element;
    const exact = viewElements.find(view => view.id === element.id);
    if (exact) return { ...element, viewElementId: exact.id };
    const candidates = viewElements.filter(view => view.ref === element.ref && compatible(element.kind, view.kind));
    if (candidates.length > 0) return { ...element, viewElementId: candidates[0].id };
    const sameRef = viewElements.find(view => view.ref === element.ref);
    return sameRef ? { ...element, viewElementId: sameRef.id } : element;
  });
}

export function enrichScene(legacy, scene) {
  if (!scene || !Array.isArray(scene.elements)) return scene;
  return { ...scene, elements: attachViewElementIds(legacy, scene.elements) };
}

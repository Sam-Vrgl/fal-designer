export function createVelvetTexture(ctx, color) {
  const patternCanvas = document.createElement('canvas');
  const patternCtx = patternCanvas.getContext('2d');
  const size = 40;
  patternCanvas.width = size;
  patternCanvas.height = size;

  patternCtx.fillStyle = color;
  patternCtx.fillRect(0, 0, size, size);

  const imageData = patternCtx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 25;
    data[i] -= noise;
    data[i + 1] -= noise;
    data[i + 2] -= noise;
  }
  patternCtx.putImageData(imageData, 0, 0);

  return ctx.createPattern(patternCanvas, 'repeat');
}

export function createSatinTexture(ctx, color) {
  const patternCanvas = document.createElement('canvas');
  const patternCtx = patternCanvas.getContext('2d');
  const size = 12;
  patternCanvas.width = size;
  patternCanvas.height = size;

  patternCtx.fillStyle = color;
  patternCtx.fillRect(0, 0, size, size);

  patternCtx.beginPath();
  patternCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  patternCtx.lineWidth = 1.5;
  patternCtx.moveTo(-2, size + 2);
  patternCtx.lineTo(size + 2, -2);
  patternCtx.stroke();

  return ctx.createPattern(patternCanvas, 'repeat');
}
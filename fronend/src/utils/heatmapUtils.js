export const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export const scoreLabel = (score) => {
  const value = Number(score) || 0;
  if (value > 0.2) return 'Positive';
  if (value < -0.2) return 'Negative';
  return 'Neutral';
};

export const scoreToColor = (score) => {
  const normalized = clamp(Number(score) || 0, -1, 1);
  const hue = normalized >= 0 ? 120 * normalized : 0;
  const lightness = normalized >= 0 ? 26 + normalized * 18 : 32 + Math.abs(normalized) * 16;
  return `hsl(${hue}, 78%, ${lightness}%)`;
};

const hslToRgb = (h, s, l) => {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = lightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (h < 60) {
    red = chroma;
    green = second;
  } else if (h < 120) {
    red = second;
    green = chroma;
  }

  return [
    Math.round((red + match) * 255),
    Math.round((green + match) * 255),
    Math.round((blue + match) * 255),
  ];
};

export const scoreToRgb = (score) => {
  const normalized = clamp(Number(score) || 0, -1, 1);
  const hue = normalized >= 0 ? 120 * normalized : 0;
  const lightness = normalized >= 0 ? 26 + normalized * 18 : 32 + Math.abs(normalized) * 16;
  return hslToRgb(hue, 78, lightness);
};

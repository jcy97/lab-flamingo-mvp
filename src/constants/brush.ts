// 다양한 브러시 프리셋 정의
export const brushPresets = {
  pencil: {
    color: "#444444",
    size: 2,
    opacity: 0.8,
    smoothing: 0.3,
    pressure: true,
    blendMode: "normal",
    type: "round",
  },
  pen: {
    color: "#000000",
    size: 3,
    opacity: 1,
    smoothing: 0.5,
    pressure: true,
    blendMode: "normal",
    type: "round",
  },
  marker: {
    color: "#000000",
    size: 10,
    opacity: 0.7,
    smoothing: 0.3,
    pressure: false,
    blendMode: "multiply",
    type: "round",
  },
  highlighter: {
    color: "#ffff00",
    size: 20,
    opacity: 0.3,
    smoothing: 0.1,
    pressure: false,
    blendMode: "screen",
    type: "square",
  },
  watercolor: {
    color: "#3366cc",
    size: 15,
    opacity: 0.4,
    smoothing: 0.7,
    pressure: true,
    blendMode: "multiply",
    type: "texture",
    texture: "/brushes/watercolor-texture.png", // TODO 나중에 추가해야함 - 텍스쳐 이미지 경로
  },
  eraser: {
    color: "#ffffff",
    size: 10,
    opacity: 1,
    smoothing: 0.5,
    pressure: true,
    blendMode: "destination-out", // 특수 합성 모드로 지우기 구현
    type: "round",
  },
};

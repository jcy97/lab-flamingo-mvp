/**
 * 두 가지 랜덤 색상을 생성하여 조합한 색상 값을 반환하는 함수입니다.
 *
 * @returns {string} - 랜덤으로 생성된 RGB 색상 문자열 (형식: 'rgb(r, g, b)')
 *                    각 r, g, b 값은 0에서 255 사이의 정수입니다.
 */
export const getRandomColor = (): string => {
  const r = Math.floor(Math.random() * 256); // 0-255 사이의 랜덤 값
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * 주어진 닉네임에 기반하여 오늘 날짜에 맞는 색상을 생성하는 함수.
 *
 * @param {string} nickname - 유저의 닉네임.
 * @returns {string} - HSL 색상 문자열 (형식: 'hsl(hue, saturation%, lightness%').
 *
 * 이 함수는 닉네임의 문자 코드 합계와 오늘 날짜의 길이를 이용하여
 * 고유한 색상을 생성합니다. 같은 닉네임에 대해서는 매일 동일한 색상이
 * 반환되며, 날짜가 변경될 경우 색상이 달라질 수 있습니다.
 */
export const getColorForUser = (nickname: string) => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD 형식
  const hashCode = nickname
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = `hsl(${(hashCode + today.length) % 360}, 70%, 60%)`; // HSL 색상 생성
  return color;
};

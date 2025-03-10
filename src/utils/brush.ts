import { getStroke } from "perfect-freehand";

export const getPointsForKonvaLine = (
  points: number[],
  options = {},
): number[] => {
  // 1차원 배열을 getStroke에 필요한 2차원 배열로 변환
  const pointPairs: [number, number][] = []; // 명시적으로 [number, number] 타입 지정
  for (let i = 0; i < points.length; i += 2) {
    // i+1이 배열 범위 내에 있는지 확인하고, 두 값이 모두 undefined가 아닌지 확인
    if (
      i + 1 < points.length &&
      points[i] !== undefined &&
      points[i + 1] !== undefined
    ) {
      // 타입 단언을 사용하여 TypeScript에게 값이 존재함을 알림
      pointPairs.push([points[i] as number, points[i + 1] as number]);
    }
  }

  // points 배열이 비어있으면 원본 배열 반환
  if (pointPairs.length === 0) return points;

  // getStroke에 추가 옵션 설정 가능
  const defaultOptions = {
    size: 8, // 선의 기본 두께
    thinning: 0.5, // 필압에 따른 두께 변화 정도 (0~1)
    smoothing: 0.5, // 곡선의 부드러움 (0~1)
    streamline: 0.5, // 입력 점 간 보간 정도 (0~1)
    easing: (t: number) => t, // 두께 변화 이징 함수
    last: false, // 마지막 점 특별 처리 여부
  };

  // getStroke 함수를 사용하여 윤곽선 생성
  const stroke = getStroke(pointPairs, { ...defaultOptions, ...options });

  // 윤곽선을 Konva Line 포인트 배열로 평탄화
  if (stroke.length === 0) return points;

  const flattenedPoints: number[] = [];
  stroke.forEach((point) => {
    flattenedPoints.push(point[0]!, point[1]!);
  });

  return flattenedPoints;
};

import { IconType } from "react-icons";
import { PiRabbitFill } from "react-icons/pi";
import { IoLogoOctocat } from "react-icons/io";
import { TbDog } from "react-icons/tb";
import { FaEarlybirds } from "react-icons/fa";
import { GiBearFace } from "react-icons/gi";

const ICONS: Array<{ component: IconType; id: string }> = [
  { component: PiRabbitFill, id: "rabbit" },
  { component: IoLogoOctocat, id: "octopus" },
  { component: TbDog, id: "dog" },
  { component: FaEarlybirds, id: "bird" },
  { component: GiBearFace, id: "bear" },
];

/**
 * 주어진 사용자 닉네임에 따라 아이콘을 반환하는 함수입니다.
 *
 * 이 함수는 현재 날짜와 사용자의 닉네임을 결합하여 고유한 문자열을 생성한 후,
 * 해당 문자열을 해싱하여 아이콘 배열에서 인덱스를 계산합니다.
 *
 * @param {string} nickname - 사용자 닉네임
 * @returns {IconType} - 사용자에 대한 아이콘 컴포넌트
 */
export const getIconForUser = (nickname: string): IconType => {
  const today = new Date().toISOString().split("T")[0];
  const stringToHash = `${nickname}-${today}`;

  let hash = 0;
  for (let i = 0; i < stringToHash.length; i++) {
    hash = (hash << 5) - hash + stringToHash.charCodeAt(i);
    hash = hash & hash;
  }

  const positiveHash = Math.abs(hash);
  const iconIndex = positiveHash % ICONS.length;

  return ICONS[iconIndex]!.component;
};

import { IPort } from "../../../core/sequence/BaseNode";

/**
 * 포트의 데이터 타입에 따라 고유한 색상을 반환합니다.
 * @param type 포트의 데이터 타입
 * @returns CSS 색상 문자열
 */
export const getPortColor = (type: IPort['type']) => {
  switch (type) {
    case 'string': return '#e6db74'; // Yellow
    case 'number': return '#a6e22e'; // Green
    case 'boolean': return '#f92672'; // Red
    case 'execution': return '#ffffff'; // White
    case 'enum': return '#66d9ef'; // Cyan
    default: return '#ae81ff'; // Purple for 'any'
  }
};

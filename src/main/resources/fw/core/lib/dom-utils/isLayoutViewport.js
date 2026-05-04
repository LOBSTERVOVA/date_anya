import getUAString from "../utils/userAgent.d.ts";
export default function isLayoutViewport() {
  return !/^((?!chrome|android).)*safari/i.test(getUAString());
}
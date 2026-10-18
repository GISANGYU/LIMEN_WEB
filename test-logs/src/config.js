// 이 값들은 전시 기획의 확정 수치가 아닌 웹 모션 시안의 조절값입니다.
export const presets = {
  limen: {depth:1000, dip:0.8, wave:18, speed:0.85, chroma:0.8, smoothing:0.075, bendStart:0.17, touch:1, parallax:1, scrollGain:0.35},
  reference: {depth:1200, dip:0.95, wave:12, speed:1.0, chroma:0.85, smoothing:0.055, bendStart:0.17, touch:1, parallax:1, scrollGain:0.35},
  still: {depth:0, dip:0, wave:0, speed:0, chroma:0, smoothing:1, bendStart:0.12, touch:0, parallax:0, scrollGain:0.35},
};
export const controls = [
  ['depth','Bend depth',0,2200,10], ['bendStart','Bend start',0,0.45,0.01],
  ['dip','Fold dip',0,2.2,0.05],
  ['wave','Wave strength',0,65,1], ['speed','Wave speed',0,2,0.05],
  ['chroma','Chromatic fringe',0,3,0.1],
  ['smoothing','Scroll easing',0.03,1,0.01], ['touch','Touch shimmer',0,2,0.05], ['parallax','View drift',0,2,0.05], ['scrollGain','Scroll speed',0.1,1,0.05],
];
// 테스트 그래픽 이름입니다. F01~F06 장면 번호나 확정 비주얼이 아닙니다.
export const studies = [
  {title:'Form / Field',en:'Website Design, Digital Experience',kind:0},
  {title:'Still Studio',en:'Brand Identity, Business Cards',kind:1},
  {title:'Ordinary Journal',en:'Editorial Website',kind:2},
  {title:'Well',en:'Mobile App, Product Design',kind:3},
  {title:'Off / Grid',en:'Visual Identity, Print Design',kind:4},
  {title:'Atlas',en:'Dashboard, Interface Design',kind:5},
];

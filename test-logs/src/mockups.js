// Original, code-drawn placeholder projects. No external project imagery is copied.
export function drawMockup(kind){
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=840;
  const c=canvas.getContext('2d');
  const text=(str,x,y,size=24,color='#202124',weight=400)=>{c.fillStyle=color;c.font=`${weight} ${size}px Arial`;c.fillText(str,x,y);};
  const rect=(x,y,w,h,color,r=0)=>{c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
  const paper=(x,y,w,h,color,r=0)=>{c.save();c.shadowColor='#17202b35';c.shadowBlur=40;c.shadowOffsetY=24;rect(x,y,w,h,color,r);c.restore();};
  const orb=(x,y,r,a,b)=>{const g=c.createRadialGradient(x-r*.4,y-r*.4,1,x,y,r);g.addColorStop(0,a);g.addColorStop(1,b);c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
  if(kind===0){
    rect(0,0,1600,840,'#dce2e0');paper(165,90,1270,665,'#151c23',16);
    rect(178,103,1244,622,'#f2f3e8',7);rect(690,725,220,23,'#222d36',7);
    text('FORM / FIELD',225,155,23,'#252f29',600);text('Studio     Work     About     ↗',1045,155,18);
    text('A quieter',245,325,92,'#203c2d',500);text('digital world.',245,424,92,'#203c2d',500);
    text('Independent design for things that matter.',250,494,24,'#617367');
    rect(250,540,174,52,'#284a36',28);text('Explore work  ↗',275,574,19,'#fff');
    orb(1070,422,204,'#d6f06f','#23533f');orb(1200,525,98,'#e1fbc5','#567c5b');
    text('01 / NEW PERSPECTIVES',250,680,17,'#6d7870');
  }else if(kind===1){
    rect(0,0,1600,840,'#edd7c5');
    c.save();c.translate(615,374);c.rotate(-.16);paper(-410,-222,820,444,'#f9f7ef');
    text('STILL',-346,-87,104,'#27332c',500);text('A design practice',-338,-37,23,'#536158');
    text('Jamie Taylor',-338,133,22);text('Design Director',-338,165,17,'#657167');text('still.studio  ↗',160,165,19);c.restore();
    c.save();c.translate(1015,524);c.rotate(.12);paper(-310,-172,620,344,'#294736');
    text('still.',-242,33,100,'#d6ecc1');text('IDENTITY / 2026',-240,132,18,'#d6ecc1');
    c.strokeStyle='#b9d79e';c.lineWidth=2;c.beginPath();c.arc(245,-97,30,0,Math.PI*2);c.stroke();c.restore();
  }else if(kind===2){
    rect(0,0,1600,840,'#b8cbdc');paper(130,63,1340,718,'#fff',12);
    rect(130,63,1340,42,'#e7eaed',12);for(let i=0;i<3;i++)rect(150+i*20,79,9,9,['#eb887b','#e6c075','#83baa1'][i],5);
    text('ORDINARY / JOURNAL',195,164,25,'#20232e',600);text('Stories     Editions     Shop',1050,164,19);
    text('The shape of',196,304,84);text('everyday things.',196,395,84);
    text('Objects, people and places worth noticing.',199,457,22,'#6c727b');
    rect(195,513,170,44,'#f0f1f4',24);text('Read the journal',214,543,18);
    rect(835,213,572,459,'#fc6845');orb(1120,400,169,'#fff4d2','#d57449');
    rect(965,470,312,81,'#384564',8);text('Issue 08',885,632,25,'#fff');
    text('DESIGN',197,704,16,'#80868d');text('Objects for a slower day',197,740,28);
  }else if(kind===3){
    rect(0,0,1600,840,'#ddd2f2');
    for(let i=0;i<3;i++){
      const x=260+i*365,y=66+(i===1?45:0);paper(x,y,310,710,'#161719',40);rect(x+12,y+12,286,686,i===1?'#433476':'#f6f3fa',30);
      rect(x+107,y+22,96,21,'#171719',12);text('9:41',x+30,y+40,13,i===1?'#fff':'#111');
      text(['well /','Your rhythm','A little room'][i],x+35,y+113,28,i===1?'#fff':'#352a52',600);
      orb(x+155,y+260,97,i===1?'#dac4fb':'#d8b1f1',i===1?'#7355a3':'#8168b3');
      text(['Make time','12 minutes','For yourself'][i],x+36,y+426,35,i===1?'#fff':'#382c55');
      text('A softer start to your day.',x+35,y+468,17,i===1?'#d5c6f4':'#8b819a');
      rect(x+30,y+530,250,58,i===1?'#f1e8ff':'#473276',28);text('Begin session  →',x+68,y+566,19,i===1?'#473276':'#fff');
      text('○        ◇        ≡',x+61,y+657,28,i===1?'#c9b7e7':'#a094b2');
    }
  }else if(kind===4){
    rect(0,0,1600,840,'#c6c6bc');
    c.save();c.translate(525,403);c.rotate(-.07);paper(-300,-341,600,682,'#e95730');
    text('OFF',-251,-198,150,'#fff8d2',600);text('GRID',-251,-59,150,'#fff8d2',600);
    c.strokeStyle='#fff8d2';c.lineWidth=3;for(let i=0;i<11;i++){c.beginPath();c.ellipse(0,114,210-i*11,75+i*8,-.38,0,Math.PI*2);c.stroke();}
    text('ART, SOUND & NEW IDEAS',-250,275,20,'#fff8d2');c.restore();
    c.save();c.translate(1090,464);c.rotate(.09);paper(-250,-305,500,610,'#edeedd');
    text('OFF / GRID',-200,-220,44);text('Independent',-200,55,52);text('by nature.',-200,115,52);
    rect(-200,194,399,1,'#1e2420');text('Visual identity study',-200,238,18);c.restore();
  }else{
    rect(0,0,1600,840,'#d2dbea');paper(118,82,1364,676,'#fff',18);rect(118,82,242,676,'#172a3b',18);
    text('atlas',162,163,44,'#d8ebf4',600);['Overview','Projects','Activity','Members','Settings'].forEach((t,i)=>text(t,163,251+i*58,22,i?'#8fabbf':'#fff'));
    text('Good morning, Alex.',407,165,32);text('Your workspace at a glance.',408,203,18,'#8a9299');
    ['Active projects','Completed','Team members'].forEach((t,i)=>{rect(404+i*338,249,310,127,['#e5eefb','#e7efe8','#fff1d8'][i],12);text(t,426+i*338,284,17,'#69747e');text(['12','48','08'][i],426+i*338,343,42,'#263c53',500);});
    rect(404,408,985,271,'#f8f9fb',12);text('Project momentum',432,449,21,'#324860',600);
    c.strokeStyle='#dce2e9';for(let i=0;i<4;i++){c.beginPath();c.moveTo(432,490+i*45);c.lineTo(1355,490+i*45);c.stroke();}
    c.strokeStyle='#5c83bf';c.lineWidth=5;c.beginPath();for(let i=0;i<15;i++){const x=444+i*63,y=625-i*8-Math.sin(i*.9)*29;i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
    text('MON             TUE             WED             THU             FRI',433,718,16,'#7f8b97');
  }
  return canvas;
}

t-=1<<11,
q=t>>11&7,
e=~(q<1?t>>3:q<3?128+(t>>4):q<7?(t>>5)+64:(~t>>5)-64),
N=p=>(t*p&255&e)/4,
C=n=>N(n[0])+N(n[1])+N(n[2])+N(n[3])+(t*n[0]&255)/4,
P=t>>14&3,
B=C([[3,9/2,21/4,57/8],[2,3,5,7],[8/3,4,6,20/3],[20/9,50/9,4,20/3]][P]),
M=t*"<<<H???0\0<6<666H<<<H??00\0006<<666\0<?H<?HQ\0HQZHQZ`HQZ`QZ`lQHx\0xll\0H".charCodeAt(t>>11&63)/9&175,
D=128*sin(4096/(t&4095))+128,
M/4+B/3+D/4
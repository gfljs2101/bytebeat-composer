BPM = 125,
A = 440,
T = t/93.75*BPM/60,
k = max(-.1,min(.1,asin(sin(2**(-T/8%16+5)))*9))*3*(73>>(T>>7&7)&1),
h = random()/max(1,T%128/9)/3,
s = sin((t>>(T%128>30?3:4))**7)/max(2,T%128/9)*((T>>7)%8==4),
b = t/1500*440*(2**(1/12))**(T>8192?[-2,-4,3,-2][T>>11&3]:-2)*((37394>>(T>>7&15)&1)+1)%256/350*(1-T%128/200)-.5,
m = ((t/375*A*(2**(1/12))**[10,10,5,,8,,3,5,,1,,-4,-2,,8,10,1,1,3,,0,,3,8,13,13,12,,8,,3,3,1,1,3,,13,,8,13,15,13,3,,1,,-4,,-2][T>>7&63])*ceil(4/max(1,(T%128)/20))%256>70?1:0)/3,
(k+h+s+b+(T>8192?m:0))/1.5
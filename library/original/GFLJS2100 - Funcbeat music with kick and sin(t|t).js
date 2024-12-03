return function (t,sr) {

const sint = (sin((-t*64|-t*44100)*-PI/128))/4

const sawtooth = (t*2%1)*3

const sawtooth2 = (t*4%1)*5

const kick = ((sin((t*4%2)**.05*240))*1.3)/1.4

const kick2 = ((sin((t*2%2)**.07*240))*1.3)/1.4

return ((((((((((((sint*2+(sin(t*4|t*1378.125))/2+(sin(t*8|t*1378.125*2))/2)/2)+(sin(sr*(t*8|t*11025/8)/4))/4)/2)+(sin((t*11025/4|t*8|t*16))/4))/4))*4)+((random()*2-1)*(1-(t*4)%1/1))/2)*3)+((kick+(kick2*1.5))*2.5))/1.5**(sawtooth+sawtooth2)*2)/4}

t==0?(
    // Initialize
    RESP_INC = 7,
    RESP_DEC = 20,
    RESP_PREC = 8,
    LPF_STRENGTH = 100,

    // RESP_INC = 1,
    // RESP_DEC = 1,
    // RESP_PREC = 10,
    // LPF_STRENGTH = 140,

    response = 0,
    level = 0,
    lastbit = false,
    pcm = [],

    flastlevel = 0,
    lpflevel = 0,


    ctx_update = (curbit) => {
        let target = curbit ? 127 : -128;
        let nlevel =
            level +
            ((response * (target - level) + (1 << (RESP_PREC - 1))) >> RESP_PREC);
        if (nlevel == level && level != target) nlevel += curbit ? 1 : -1;

        let rtarget;
        let rdelta;
        if (curbit == lastbit) {
            rtarget = (1 << RESP_PREC) - 1;
            rdelta = RESP_INC;
        } else {
            rtarget = 0;
            rdelta = RESP_DEC;
        }

        let nresponse =
            response +
            ((rdelta * (rtarget - response) + (1 << (RESP_PREC - 1))) >> RESP_PREC);
        if (nresponse == response && response != rtarget)
            nresponse += curbit == lastbit ? 1 : -1;

        if (RESP_PREC > 8) {
            if (nresponse < 2 << (RESP_PREC - 8)) nresponse = 2 << (RESP_PREC - 8);
        }

        response = nresponse;
        lastbit = curbit;
        level = nlevel;
    },
    decode = (byte, pass) => {
        if (pass) return this.pcm;

        let pcm = [];

        for (let j = 0; j < 8; j++) {
            // apply context
            let curbit = (byte & 1) != 0;
            let lastbit_l = lastbit;
            ctx_update(curbit);
            byte >>= 1;

            // apply noise shaping
            let blevel = curbit == lastbit_l ? level : (flastlevel + level + 1) >> 1;
            flastlevel = level;

            // apply low-pass filter
            lpflevel += (LPF_STRENGTH * (blevel - lpflevel) + 0x80) >> 8;
            pcm.push(lpflevel);
        }

        return pcm;
    },
    getByte = (i) => {
        const start = i * 2;
        const end = start + 2;
        const hexPair = hex.substring(start, end);
        return parseInt(hexPair, 16);
    },
    getSample = (at) => {
        let pcmpointer = at&7;
        let datapointer = Math.floor(at/8);

        pcm = decode(getByte(datapointer), pcmpointer != 0);
        let sample_l = pcm[pcmpointer];

        pcmpointer_old = pcm;
        return sample_l;
    }
):getSample(t)
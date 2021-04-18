"use strict";
// Author: Thomas Kubler, Maj, USAF
//  Department of Electrical and Computer Engineering, United States Air Force Academy
// JavaScript source code

/******************************************** PHYSICAL CONSTANTS ************************************************************************/
const SOL = 300000000; //speed of light will be 3x 10 ^8 m/s, per equation sheet
const FOURPI = 4*Math.PI;
const FOURPICUBE = 4*4*4*Math.PI*Math.PI*Math.PI;
const KMPERMILE = 1.61; //per equation sheet
const BOLTZ = 1.38*Math.pow(10,-23); //Boltzmann's constant 1.38*10^-23
const TWOPI = 2*Math.PI;
const PI = Math.PI;
//all distances are in meters
/******************************************** SCENARIO VARIABLES *********************************************************/
var freq;
var wavelength;
var friis_range;
var los_total;
var los_tx;
var los_rx;
var comm_range_viable;
var comm_snr_min;
var comm_snr_act;
var friis_p_r;
var friis_p_r_min;
var friis_p_t;
var friis_r_max;
var height_tx;
var height_rx;
var gain_tx;
var gain_rx;
var tx_antenna_type;
var tx_antenna_length;
var tx_antenna_radius;
var tx_antenna_eta;
var rx_antenna_type;
var rx_antenna_length;
var rx_antenna_radius;
var rx_antenna_eta;
var jammer_height;
var jammer_gain;
var jammer_range;
var jammer_power;
var thermal_bandwidth;
var thermal_temperature;
const minvertical = 0;
const maxvertical = 500000;
const mingain = 0.1;
const maxgain = Math.pow(10,12);
const minnorm = 1;
const maxnorm = 999;
const mindist = 1;
const maxdist = 999999999;
var multiplier; //for remembering scale :(
//******************************************* INITIALIZATION FUNCTION ****************************************** */
function NewMathAtItem(mathexpression, htmlitem){
    var input = mathexpression;
    var output = document.getElementById(htmlitem);
    output.innerHTML = '';
    MathJax.texReset();
    var options = MathJax.getMetricsFor(output);
    //options.display = display.checked;
    MathJax.tex2chtmlPromise(input, options).then(function (node) {
      //
      //  The promise returns the typeset node, which we add to the output
      //  Then update the document to include the adjusted CSS for the
      //    content of the new equation.
      //
      output.appendChild(node);
      MathJax.startup.document.clear();
      MathJax.startup.document.updateDocument();
    }).catch(function (err) {
      //
      //  If there was an error, put the message into the output instead
      //
      output.appendChild(document.createElement('pre')).appendChild(document.createTextNode(err.message));
    }).then(function () {
      //
      //  Error or not, re-enable the display and render buttons
      //
      //button.disabled = display.disabled = false;
    });
}
function InitPage () {
    console.log("loading page");
    ChangedInput(); //pulls in freq value from default HTML
}
//generic, enforce numerical entries
function EnforceNumericalHTML(entryitem, min, max){
    var current = document.getElementById(entryitem).value;
    if(isNaN(current)) current = 0;
    if(current < min) current = min;
    if(current > max) current = max;
    document.getElementById(entryitem).value = current;
}
//generic, ChangedInput (go through all)
function SetLengthHTML(length, arghtml, exphtml){
    if(length > 1000){
        document.getElementById(exphtml).value="3";
        document.getElementById(arghtml).value = length/1000.0;
    }
    else if(length > 1){
        document.getElementById(exphtml).value="0";
        document.getElementById(arghtml).value = length;
    }
    else{
        document.getElementById(exphtml).value="-3";
        document.getElementById(arghtml).value = length*1000.0;
    }
}
function getBaseLog(x, y) {
    return Math.log(y) / Math.log(x);
  }
//generic compute dish gain
function ComputeDishGain(radius, wavelength, eta){
    //check for valid numbers and then return
    if(isNaN(radius)) return 0;
    if(isNaN(wavelength)) return 0;
    if(isNaN(eta)) return;
    if(wavelength <= 0) return 0;
    if(radius <= 0) return 0;
    if(eta <= 0) return 0;
    return eta*(TWOPI*radius)*(TWOPI*radius)/(wavelength*wavelength);
}
function ChangedInput(){
    //1. look at the frequency and compute wavelength for it.
    EnforceNumericalHTML("commfreqarg",minnorm,maxnorm);
    var newarg = document.getElementById("commfreqarg").value;
    var newexp = document.getElementById("commfreqexp").value;
    freq = newarg * Math.pow(10,newexp);
    wavelength = SOL/freq;
    var ff = MakeEngNotation(freq,"Hz",false,true);
    var ww = MakeEngNotation(wavelength, "m",false,true);
    var wavelengthexpression = "\\lambda=\\frac{c}{f}=\\frac{3 \\times 10^8 m/s}{"+ff+"}="+ww;
    NewMathAtItem(wavelengthexpression,"lambdaeqn");

    //2. check the tx dish type and compute as necessary
    tx_antenna_type = parseInt(document.getElementById("transmittertype").value);
    document.getElementById("txlengthtext").hidden = false;
    document.getElementById("txantennalength").hidden = false;
    document.getElementById("txantennaexp").hidden = false;
    document.getElementById("txetatext").hidden = true;
    document.getElementById("txdisheta").hidden = true;
    document.getElementById("txgain").disabled = true;
    document.getElementById("txantennalength").disabled = true;
    if(tx_antenna_type == 1){ //DIPOLE - computer provides gain and length
        document.getElementById("txlengthtext").textContent = "Dipole length: ";
        gain_tx = 1.64;
        document.getElementById("txgain").value = gain_tx;
        //use 1/2 wavelength
        var alength = wavelength/2.0;
        SetLengthHTML(alength,"txantennalength","txantennaexp");
    }
    else if(tx_antenna_type == 2){ //MONOPOLE - computer provides gain and length
        document.getElementById("txlengthtext").textContent = "Monopole length: ";
        gain_tx = 3.28;
        document.getElementById("txgain").value = gain_tx;
        //use 1/4 wavelength
        var alength = wavelength/4.0;
        SetLengthHTML(alength,"txantennalength","txantennaexp");
    }
    else if(tx_antenna_type == 3){ //PARABOLIC - user input radius and eta, computer gives gain if those are values
        document.getElementById("txlengthtext").textContent = "Radius (not diameter): ";
        document.getElementById("txetatext").hidden = false;
        document.getElementById("txdisheta").hidden = false;
        document.getElementById("txantennalength").disabled = false;
        EnforceNumericalHTML("txantennalength",minnorm,maxnorm);
        var exp = parseFloat(document.getElementById("txantennaexp").value);
        tx_antenna_length = document.getElementById("txantennalength").value * Math.pow(10,exp);
        EnforceNumericalHTML("txdisheta",0,1);
        tx_antenna_eta = document.getElementById("txdisheta").value;
        gain_tx = ComputeDishGain(tx_antenna_length,wavelength,tx_antenna_eta);
        document.getElementById("txgain").value = gain_tx;
    }
    else{
        document.getElementById("txlengthtext").hidden = true;
        document.getElementById("txantennalength").hidden = true;
        document.getElementById("txantennaexp").hidden = true;
        document.getElementById("txgain").disabled = false;
        EnforceNumericalHTML("txgain",mingain,maxgain);
        gain_tx = document.getElementById("txgain").value;
    }
    //3. check the rx dish type and compute as well
    rx_antenna_type = parseInt(document.getElementById("receivertype").value);
    document.getElementById("rxlengthtext").hidden = false;
    document.getElementById("rxantennalength").hidden = false;
    document.getElementById("rxantennaexp").hidden = false;
    document.getElementById("rxetatext").hidden = true;
    document.getElementById("rxdisheta").hidden = true;
    document.getElementById("rxgain").disabled = true;
    document.getElementById("rxantennalength").disabled = true;
    if(rx_antenna_type == 1){ //DIPOLE - computer provides gain and length
        document.getElementById("rxlengthtext").textContent = "Dipole length: ";
        gain_rx = 1.64;
        document.getElementById("rxgain").value = gain_rx;
        //use 1/2 wavelength
        var alength = wavelength/2.0;
        SetLengthHTML(alength,"rxantennalength","rxantennaexp");
    }
    else if(rx_antenna_type == 2){ //MONOPOLE - computer provides gain and length
        document.getElementById("rxlengthtext").textContent = "Monopole length: ";
        gain_rx = 3.28;
        document.getElementById("rxgain").value = gain_rx;
        //use 1/4 wavelength
        var alength = wavelength/4.0;
        SetLengthHTML(alength,"rxantennalength","rxantennaexp");
    }
    else if(rx_antenna_type == 3){ //PARABOLIC - user input radius and eta, computer gives gain if those are values
        document.getElementById("rxlengthtext").textContent = "Radius (not diameter): ";
        document.getElementById("rxetatext").hidden = false;
        document.getElementById("rxdisheta").hidden = false;
        document.getElementById("rxantennalength").disabled = false;
        EnforceNumericalHTML("rxantennalength",1,999);
        var exp = parseFloat(document.getElementById("rxantennaexp").value);
        rx_antenna_length = document.getElementById("rxantennalength").value * Math.pow(10,exp);
        EnforceNumericalHTML("rxdisheta",0,1);
        rx_antenna_eta = document.getElementById("rxdisheta").value;
        gain_rx = ComputeDishGain(rx_antenna_length,wavelength,rx_antenna_eta);
        document.getElementById("rxgain").value = gain_rx;
    }
    else{
        document.getElementById("rxlengthtext").hidden = true;
        document.getElementById("rxantennalength").hidden = true;
        document.getElementById("rxantennaexp").hidden = true;
        document.getElementById("rxgain").disabled = false;
        EnforceNumericalHTML("rxgain",mingain,maxgain);
        gain_rx = document.getElementById("rxgain").value;
    }

    //4. Compute Friis
    EnforceNumericalHTML("friisrange",mindist,maxdist);
    friis_range = document.getElementById("friisrange").value * Math.pow(10,document.getElementById("friisrangeexp").value);
    EnforceNumericalHTML("powertransmitted",minnorm,maxnorm);
    friis_p_t = document.getElementById("powertransmitted").value * Math.pow(10,document.getElementById("powertransmittedexp").value);
    var pt, gt, gr, rr, ll,pr,prneat;
    pt = MakeTripleNotation(friis_p_t,"W");
    gt = MakeTripleNotation(gain_tx);
    gr = MakeTripleNotation(gain_rx);
    ll = MakeTripleNotation(wavelength,"m");
    rr = MakeTripleNotation(friis_range,"m");
    friis_p_r = friis_p_t*gain_tx*gain_rx*wavelength*wavelength/(FOURPI*FOURPI*friis_range*friis_range);
    pr = MakeTripleNotation(friis_p_r,"W");
    prneat = MakeEngNotation(friis_p_r,"W",false,true);
    var friisexpression = "P_R=P_T G_T G_R {\\lambda^2 \\over (4 \\pi R)^2}="
                           +pt+"\\times "+gt+"\\times "+gr+"\\frac{("+ll+")^2}{(4\\pi \\times "+rr+")^2}="
                           +pr+"="+prneat;
    NewMathAtItem(friisexpression,"friiseqn");

    //5. Compute R_max
    EnforceNumericalHTML("prminvalue",minnorm,maxnorm);
    friis_p_r_min = document.getElementById("prminvalue").value * Math.pow(10,document.getElementById("prminexp").value);
    var prmin = MakeTripleNotation(friis_p_r_min,"W");
    friis_r_max = wavelength/(FOURPI)*Math.sqrt(friis_p_t/friis_p_r_min*gain_tx*gain_rx);
    var rmaxtriple = MakeTripleNotation(friis_r_max,"m");
    var rmaxeng = MakeEngNotation(friis_r_max,"m",true,false);
    var rmaxexpression = "R_{Friis}=R_{Max}={\\lambda \\over 4 \\pi}\\sqrt{{P_T \\over P_{Rmin}}G_T G_R}="+
                         "\\frac{"+ll+"}{4\\pi}\\sqrt{\\frac{"+pt+"}{"+prmin+"}"+gt+"\\times "+gr+"}="+
                         rmaxtriple+rmaxeng;
    NewMathAtItem(rmaxexpression,"rmaxeqn");

    //6. Compute Lines-of-sight
    var rmiles,tmiles,miles, dtmiles, drmiles,displaymiles, tkms, rkms, kms, displaykms;
    EnforceNumericalHTML("txheight",minvertical,maxvertical);
    height_tx = parseFloat(document.getElementById("txheight").value);
    tmiles = Math.sqrt(2*height_tx); //miles first, set HTML
    dtmiles = tmiles.toPrecision(4);
    tkms = tmiles*1.61;
    displaykms = tkms.toPrecision(4);
    los_tx = tkms*1000;
    document.getElementById("txrlosmi").textContent = dtmiles.toString();
    document.getElementById("txrloskm").textContent = displaykms.toString();

    EnforceNumericalHTML("rxheight",minvertical,maxvertical);
    height_rx = parseFloat(document.getElementById("rxheight").value);
    rmiles = Math.sqrt(2*height_rx); //miles first, set HTML
    drmiles = rmiles.toPrecision(4);
    rkms = rmiles*1.61;
    displaykms = rkms.toPrecision(4);
    los_rx = rkms*1000;
    document.getElementById("rxrlosmi").textContent = drmiles.toString();
    document.getElementById("rxrloskm").textContent = displaykms.toString();

    los_total = los_tx + los_rx; //in meters

    miles = rmiles + tmiles;
    displaymiles = miles.toPrecision(4);
    kms = miles*1.61;
    displaykms = kms.toPrecision(4);
    
    var rlosexpression = "R_{LOS}=\\sqrt{2h_1}+\\sqrt{2h_2}=\\sqrt{2\\times "+height_tx+"}+\\sqrt{2\\times "+height_rx+"}=("+
                        dtmiles+" mi +"+drmiles+" mi) \\times 1.61\\frac{km}{mi}="+displaykms+" km";
    NewMathAtItem(rlosexpression,"rloseqn");

    //7. Determine at what range communication is possible for the two heights and the Pt/Pr_min scenario
    comm_range_viable = Math.min(los_total, friis_r_max);
    var commexpression = "R_{Comm}=Min(R_{LOS},R_{Friis})=";
    var los_total_text = MakeEngNotation(los_total,"m");
    var friis_range_text = MakeEngNotation(friis_r_max,"m");
    if(los_total < friis_r_max){
        commexpression += los_total_text;
    }
    else{
        commexpression += rmaxtriple + "="+friis_range_text;
    }
    NewMathAtItem(commexpression,"rcommeqn");

    ChangeLowerInput(true);

    UpdateCanvas(); //go to the drawing function

}
function MakeTripleNotation(value,units=""){
    var exp = Math.log(value) / Math.log(10);
    var triplets = Math.round(exp/3.0-0.5);
    var t_exp = 3*triplets;
    var argument = value / Math.pow(10,t_exp);
    var argstring = argument.toPrecision(4);
    argument = parseFloat(argstring);
    //then check if argument is 1000 due to some precision in the log and rounding
    if(argument >= 1000){
        t_exp += 3;
        argument = value / Math.pow(10,t_exp);
        argstring = argument.toPrecision(4);
    }
    else if(argument < 1){
        t_exp -= 3;
        argument = value / Math.pow(10,t_exp);
        argstring = argument.toPrecision(4);
    }
    if(t_exp == 0){
        return argstring+units;
    }
    else{
        return argstring+"\\times "+"10^{"+t_exp+"}"+units;
    }
}
function MakeEngNotation(value, units, prependequals = false, forceoutput = false){
    var exp = Math.log(value) / Math.log(10);
    var triplets = Math.round(exp/3.0-0.5);
    var t_exp = 3*triplets;
    var prefix = " ";
    var output = "";
    var precision = 4; //if going to millions of meters, increase precision to keep digits from turning into sci notation
    if(prependequals){
        output = "=";
    }
    switch(t_exp){
        case -18:   prefix = "a";   break;
        case -15:   prefix = "f";   break;
        case -12:   prefix = "p";   break;
        case -9:    prefix = "n";   break;
        case -6:    prefix = "\\mu ";   break; //debugging micro? make sure to have a space after as in "\\mu " not "\\mu"
        case -3:    prefix = "m";   break;
        case 0:     prefix = " ";   break;
        case 3:     prefix = "k";   break;
        case 6:     prefix = "M";   break;
        case 9:     prefix = "G";   break;
        case 12:    prefix = "T";   break;
        case 15:    prefix = "P";   break;
        default: break;
    }
    if(units == "m"){ //don't go above km for distances
        if(t_exp >= 3){
            t_exp = 3;
            prefix = "k";
            precision = exp;
        }
    }
    if(t_exp == 0 && forceoutput == false){
        return "";
    }
    var argument = value / Math.pow(10,t_exp);
    output += argument.toPrecision(precision)+prefix+units;
    return output;
}
function ChangeLowerInput(pullfromupperhalf=false){
    //if pullfromupperhalf == true, then we will not call "ChangedInput()" and instead pull data from above to here
    //else, this was a button click in the lower half and we will push all data from the lower to the upper half (values only, not visibility)
    if(pullfromupperhalf == true){
        document.getElementById("lowerfreq").value = document.getElementById("commfreqarg").value;
        document.getElementById("lowerfreqexp").value = document.getElementById("commfreqexp").value;
        document.getElementById("lowertxheight").value = document.getElementById("txheight").value;
        document.getElementById("lowerrxheight").value = document.getElementById("rxheight").value;
        document.getElementById("lowerpowertrans").value = document.getElementById("powertransmitted").value;
        document.getElementById("lowerpowertransexp").value = document.getElementById("powertransmittedexp").value;
        document.getElementById("lowerprmin").value = document.getElementById("prminvalue").value;
        document.getElementById("lowerprminexp").value = document.getElementById("prminexp").value;
        //antenna settings :(
        document.getElementById("lowertxtype").value = document.getElementById("transmittertype").value;
        document.getElementById("lowertxtext").textContent = document.getElementById("txlengthtext").textContent;
        document.getElementById("lowertxtext").hidden = document.getElementById("txlengthtext").hidden;
        document.getElementById("lowertxlength").value = document.getElementById("txantennalength").value;
        document.getElementById("lowertxlength").hidden = document.getElementById("txantennalength").hidden;
        document.getElementById("lowertxlength").disabled = document.getElementById("txantennalength").disabled;
        document.getElementById("lowertxexp").value = document.getElementById("txantennaexp").value;
        document.getElementById("lowertxexp").hidden = document.getElementById("txantennaexp").hidden;
        document.getElementById("lowertxeta").value = document.getElementById("txdisheta").value;
        document.getElementById("lowertxeta").hidden = document.getElementById("txdisheta").hidden;
        document.getElementById("lowertxetatext").hidden = document.getElementById("txetatext").hidden;
        document.getElementById("lowertxgain").value = document.getElementById("txgain").value;
        document.getElementById("lowertxgain").disabled = document.getElementById("txgain").disabled;
        //receivers :whoooa
        document.getElementById("lowerrxtype").value = document.getElementById("receivertype").value;
        document.getElementById("lowerrxtext").textContent = document.getElementById("rxlengthtext").textContent;
        document.getElementById("lowerrxtext").hidden = document.getElementById("rxlengthtext").hidden;
        document.getElementById("lowerrxlength").value = document.getElementById("rxantennalength").value;
        document.getElementById("lowerrxlength").hidden = document.getElementById("rxantennalength").hidden;
        document.getElementById("lowerrxlength").disabled = document.getElementById("rxantennalength").disabled;
        document.getElementById("lowerrxexp").value = document.getElementById("rxantennaexp").value;
        document.getElementById("lowerrxexp").hidden = document.getElementById("rxantennaexp").hidden;
        document.getElementById("lowerrxeta").value = document.getElementById("rxdisheta").value;
        document.getElementById("lowerrxeta").hidden = document.getElementById("rxdisheta").hidden;
        document.getElementById("lowerrxetatext").hidden = document.getElementById("rxetatext").hidden;
        document.getElementById("lowerrxgain").value = document.getElementById("rxgain").value;
        document.getElementById("lowerrxgain").disabled = document.getElementById("rxgain").disabled;
        //end. this is the bottom of the top-down flow of information
    }
    else{
        EnforceNumericalHTML("lowerfreq",minnorm,maxnorm);
        document.getElementById("commfreqarg").value = document.getElementById("lowerfreq").value;
        document.getElementById("commfreqexp").value = document.getElementById("lowerfreqexp").value;
        EnforceNumericalHTML("lowertxheight",minvertical,maxvertical);
        document.getElementById("txheight").value = document.getElementById("lowertxheight").value;
        EnforceNumericalHTML("lowerrxheight",minvertical,maxvertical);
        document.getElementById("rxheight").value = document.getElementById("lowerrxheight").value;
        EnforceNumericalHTML("lowerpowertrans",minnorm,maxnorm);
        document.getElementById("powertransmitted").value = document.getElementById("lowerpowertrans").value;
        document.getElementById("powertransmittedexp").value = document.getElementById("lowerpowertransexp").value;
        EnforceNumericalHTML("lowerprmin",minnorm,maxnorm);
        document.getElementById("prminvalue").value = document.getElementById("lowerprmin").value;
        document.getElementById("prminexp").value = document.getElementById("lowerprminexp").value;
        
        //only copy values from the lower half and upper half logic will flow back down once
        document.getElementById("transmittertype").value = document.getElementById("lowertxtype").value;
        EnforceNumericalHTML("lowertxlength",minnorm,maxnorm);
        document.getElementById("txantennalength").value = document.getElementById("lowertxlength").value;
        document.getElementById("txantennaexp").value = document.getElementById("lowertxexp").value;
        EnforceNumericalHTML("lowertxeta",0,1);
        document.getElementById("txdisheta").value = document.getElementById("lowertxeta").value;
        EnforceNumericalHTML("lowertxgain",mingain,maxgain);
        document.getElementById("txgain").value = document.getElementById("lowertxgain").value;

        document.getElementById("receivertype").value = document.getElementById("lowerrxtype").value;
        EnforceNumericalHTML("lowerrxlength",minnorm,maxnorm);
        document.getElementById("rxantennalength").value = document.getElementById("lowerrxlength").value;
        document.getElementById("rxantennaexp").value = document.getElementById("lowerrxexp").value;
        EnforceNumericalHTML("lowerrxeta",0,1);
        document.getElementById("rxdisheta").value = document.getElementById("lowerrxeta").value;
        EnforceNumericalHTML("lowerrxgain",mingain,maxgain);
        document.getElementById("rxgain").value = document.getElementById("lowerrxgain").value;
        
        //call for the top-down flow
        ChangedInput();
    }
}

//******************************************************************* DRAWING ****************************************** */
var earthsize = 4;
var heightfttopixel = 200;
var sharpness = 0.2;
function ChangeEarth(growthdir){
    if(growthdir > 0){
        earthsize *= 0.9;
    }
    else{
        earthsize *= 1.1;
    }
    UpdateCanvas();
}
function ChangeHeights(growthdir){
    if(growthdir > 0){
        heightfttopixel *= 0.9;
    }
    else{
        heightfttopixel *= 1.1;
    }
    UpdateCanvas();
}
function ChangeGainArc(growthdir){
    //console.log("hello");
    if(growthdir > 0){
        sharpness *= 1.05;
    }
    else{
        sharpness *= 0.95;
    }
    UpdateCanvas();
}
function UpdateCanvas(){
    var thecanvas = document.getElementById("TheCanvas");
    var ctx = thecanvas.getContext("2d");
    //clears the canvas
    var canvas_width = thecanvas.width;
    var canvas_height = thecanvas.height;
    ctx.clearRect(0,0,canvas_width,canvas_height);

    var pix_mid_x = canvas_width / 2;
    var pix_mid_y = canvas_height / 2;
    var pix_earth_rad = canvas_height*earthsize; //get a slider for this
    var pix_max_x = canvas_width;
    var pix_max_y = canvas_height; //top-down for y coords
    var pix_height_tx = height_tx / heightfttopixel;
    var pix_height_rx = height_rx / heightfttopixel;
    var pix_hyp_tx = pix_height_tx + pix_earth_rad;
    var pix_hyp_rx = pix_height_rx + pix_earth_rad;
    var pix_los_x1 = Math.sqrt((pix_hyp_tx*pix_hyp_tx)-(pix_earth_rad*pix_earth_rad));   
    var pix_los_x2 = Math.sqrt((pix_hyp_rx*pix_hyp_rx)-(pix_earth_rad*pix_earth_rad));  
    var pix_los_total = pix_los_x1 + pix_los_x2;
    var pix_tx_x = pix_mid_x - pix_los_x1;
    var pix_tx_y = pix_mid_y;
    var pix_rx_x = pix_mid_x + pix_los_x2;
    var pix_rx_y = pix_mid_y;

    //compute the R_Friis by scaling R_LOS and draw a friis circle
    //use gradient fill
    var pix_friis_rmax;
    var oldmulti = multiplier;
    multiplier = pix_los_total / los_total;
    if(los_total < 1.0){
        multiplier = oldmulti;
        console.log("drawing is incorrect when both heights are 0'")
    }
    pix_friis_rmax= friis_r_max*multiplier;
    var gradient = ctx.createRadialGradient(pix_tx_x,pix_tx_y,0,pix_tx_x,pix_tx_y,pix_friis_rmax);
    var outercolor = 'rgb(255, 255, 200)';
    var innercolor = 'rgb(255, 165, 0)';
    gradient.addColorStop(0,innercolor);
    gradient.addColorStop(1,outercolor);
    ctx.strokeStyle = outercolor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pix_tx_x,pix_tx_y,pix_friis_rmax,0,TWOPI); //
    ctx.stroke();
    ctx.fillStyle = gradient;
    ctx.fill();
    //for gain sharpness, draw segments to block this orange-ish cloud
    //compute the angle in 0..PI from the 270-degree point
    var factor = 1.0-1/Math.pow(gain_tx,sharpness);
    console.log(factor);
    var upperrad = PI+factor*PI;
    var lowerrad = PI-factor*PI;
    var arc_x = pix_tx_x + pix_friis_rmax*Math.cos(upperrad);
    var arc_y_upper = pix_tx_y + pix_friis_rmax*Math.sin(upperrad);
    var arc_y_lower = pix_tx_y + pix_friis_rmax*Math.sin(lowerrad);
    //draw rects and triangles to show a gain pattern (pacman style)
    ctx.fillStyle = "white";
    var rect_x = Math.min(arc_x,pix_tx_x);
    ctx.fillRect(0,0,rect_x+1,pix_max_y);
    if(upperrad <= 1.5*PI){
        ctx.beginPath();
        ctx.moveTo(pix_tx_x,pix_tx_y);
        ctx.lineTo(arc_x,arc_y_upper);
        ctx.lineTo(arc_x,arc_y_lower);
        ctx.fill();
    }
    else{
        ctx.fillRect(0,0,arc_x,arc_y_upper);
        ctx.fillRect(0,arc_y_lower,arc_x,pix_max_y-arc_y_lower+1);
        ctx.beginPath();
        ctx.moveTo(pix_tx_x,pix_tx_y);
        ctx.lineTo(arc_x,arc_y_upper);
        ctx.lineTo(pix_tx_x,arc_y_upper);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(pix_tx_x,pix_tx_y);
        ctx.lineTo(arc_x,arc_y_lower);
        ctx.lineTo(pix_tx_x,arc_y_lower);
        ctx.fill();
    }
    //gray out the invisible region of the gain pattern blocked by earth
    if(friis_r_max > los_total){
        var xsize = pix_friis_rmax - (pix_mid_x - pix_tx_x);
        ctx.fillRect(pix_mid_x,pix_mid_y,pix_mid_x,pix_mid_y);
    }

    //draw the tangent behind Earth for visibility
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0,pix_mid_y);
    ctx.lineTo(pix_max_x,pix_mid_y);
    ctx.stroke();

    //draw the visibility tangent which has length R_LOS_MAX - use this value to scale the Friis circle
    ctx.strokeStyle = "red";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(pix_tx_x,pix_tx_y);
    ctx.lineTo(pix_rx_x,pix_rx_y);
    ctx.stroke();

    //draw a curved Earth surface
    ctx.strokeStyle = "green";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pix_mid_x,pix_mid_y+pix_earth_rad,pix_earth_rad,0,TWOPI);
    ctx.stroke();
    ctx.fillStyle = "green";
    ctx.fill();

    //draw curves for transmitters
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pix_mid_x,pix_mid_y+pix_earth_rad,pix_earth_rad+pix_height_tx,PI,1.5*PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pix_mid_x,pix_mid_y+pix_earth_rad,pix_earth_rad+pix_height_rx,1.5*PI,TWOPI);
    ctx.stroke();

    //draw text for solutions, starting with Line of Sight just below middle of screen
    ctx.font = "30px Arial";
    ctx.fillStyle = "black";
    var dkms = los_total/1000;
    var rlostext = dkms.toPrecision(4)+"km";
    ctx.fillText("Maximum LOS Range is "+rlostext, pix_mid_x-250, pix_mid_y+40);
    //friis range, near the transmitter
    ctx.font = "30px Arial";
    ctx.fillStyle = "black";
    var friiskms = friis_r_max/1000;
    var friistext = friiskms.toPrecision(4)+"km";
    ctx.fillText("Friis Propagation Range is "+friistext, pix_tx_x, pix_mid_y-140);
    //Tx and Rx at locations
    ctx.fillText("Tx",pix_tx_x-50,pix_tx_y-5);
    ctx.fillText("Rx",pix_rx_x+10,pix_tx_y-5);
    //replicate friis range as a line
    ctx.strokeStyle = "red";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(pix_tx_x,pix_tx_y-100);
    ctx.lineTo(pix_tx_x+pix_friis_rmax,pix_rx_y-100);
    ctx.stroke();
    //draw comm range
    var pix_comm_range = Math.min(pix_friis_rmax,pix_los_total);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(pix_tx_x,pix_tx_y+100);
    ctx.lineTo(pix_tx_x+pix_comm_range,pix_rx_y+100);
    ctx.stroke();
    var commtext = (comm_range_viable/1000).toPrecision(4)+"km";
    ctx.fillText("Communication occurs at up to "+commtext, pix_tx_x, pix_mid_y+140);
}
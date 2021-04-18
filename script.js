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
//all distances are in km, not meters, and line of sight is based upon Distance(miles) = Sqrt(2*height(feet))
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
/******************************************* VIEWING VARIABLES ************************************************************/
var whichscenario;


//document.getElementById('my-input-id').disabled = false;

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
    UpdateCanvas();
}
//generic, enforce numerical entries
function EnforceNumericalHTML(entryitem, min, max){
    var current = document.getElementById(entryitem).value;
    console.log(entryitem,current);
    if(isNaN(current)) current = 0;
    if(current < min) current = min;
    if(current > max) current = max;
    document.getElementById(entryitem).value = current;
    console.log("finish",current);
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
    EnforceNumericalHTML("commfreqarg",1,999);
    var newarg = document.getElementById("commfreqarg").value;
    var newexp = document.getElementById("commfreqexp").value;
    freq = newarg * Math.pow(10,newexp);
    wavelength = SOL/freq;
    var ff = MakeEngNotation(freq,"Hz");
    var ww = MakeEngNotation(wavelength, "m");
    var wavelengthexpression = "\\lambda=\\frac{3 \\times 10^8 m/s}{"+ff+"}="+ww;
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
        EnforceNumericalHTML("txantennalength",1,999);
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
        EnforceNumericalHTML("txgain",0,Math.pow(10,12));
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
        EnforceNumericalHTML("rxgain",0,Math.pow(10,12));
        gain_rx = document.getElementById("rxgain").value;
    }
    //4. Compute Lines-of-sight
    var miles, displaymiles, kms, displaykms;
    EnforceNumericalHTML("txheight",0,500000);
    height_tx = document.getElementById("txheight").value;
    miles = Math.sqrt(2*height_tx); //miles first, set HTML
    displaymiles = miles.toPrecision(4);
    kms = miles*1.61;
    displaykms = kms.toPrecision(4);
    los_tx = kms;
    document.getElementById("txrlosmi").textContent = displaymiles.toString();
    document.getElementById("txrloskm").textContent = displaykms.toString();

    EnforceNumericalHTML("rxheight",0,500000);
    height_rx = document.getElementById("rxheight").value;
    miles = Math.sqrt(2*height_rx); //miles first, set HTML
    displaymiles = miles.toPrecision(4);
    kms = miles*1.61;
    displaykms = kms.toPrecision(4);
    los_rx = kms;
    document.getElementById("rxrlosmi").textContent = displaymiles.toString();
    document.getElementById("rxrloskm").textContent = displaykms.toString();

    kms = los_tx + los_rx;
    displaykms = kms.toPrecision(4);
    miles = kms/1.61;
    displaymiles = miles.toPrecision(4);
    document.getElementById("rlosmi").textContent = displaymiles.toString();
    document.getElementById("rloskm").textContent = displaykms.toString();

    //5. Compute Friis
    EnforceNumericalHTML("friisrange",1,1000000);
    friis_range = document.getElementById("friisrange").value * Math.pow(10,document.getElementById("friisrangeexp").value);
    EnforceNumericalHTML("powertransmitted",1,1000000);
    friis_p_t = document.getElementById("powertransmitted").value * Math.pow(10,document.getElementById("powertransmittedexp").value);
    var pt, gt, gr, rr, ll,pr,prneat;
    pt = MakeTripleNotation(friis_p_t);
    gt = MakeTripleNotation(gain_tx);
    gr = MakeTripleNotation(gain_rx);
    ll = MakeTripleNotation(wavelength);
    rr = MakeTripleNotation(friis_range);
    friis_p_r = friis_p_t*gain_tx*gain_rx*wavelength*wavelength/(FOURPI*FOURPI*friis_range*friis_range);
    pr = MakeTripleNotation(friis_p_r);
    prneat = MakeEngNotation(friis_p_r,"W");
    var friisexpression = "P_R=P_T G_T G_R {\\lambda^2 \\over (4 \\pi R)^2}="
                           +pt+"W \\times"+gt+"\\times "+gr+"\\frac{("+ll+"m)^2}{(4\\pi \\times "+rr+"m)^2}="
                           +pr+"W="+prneat;
    NewMathAtItem(friisexpression,"friiseqn");
    //6. Compute R_max
    EnforceNumericalHTML("")
}
function MakeTripleNotation(value){
    var exp = Math.log(value) / Math.log(10);
    var triplets = Math.round(exp/3.0-0.5);
    var t_exp = 3*triplets;
    var argument = value / Math.pow(10,t_exp);
    if(t_exp == 0){
        return argument.toPrecision(4);
    }
    else{
        return argument.toPrecision(4)+"\\times "+"10^{"+t_exp+"}";
    }
}
function MakeEngNotation(value, units){
    var exp = Math.log(value) / Math.log(10);
    var triplets = Math.round(exp/3.0-0.5);
    var t_exp = 3*triplets;
    var prefix = " ";
    switch(t_exp){
        case -18:   prefix = "a";   break;
        case -15:   prefix = "f";   break;
        case -12:   prefix = "p";   break;
        case -9:    prefix = "n";   break;
        case -6:    prefix = "\\mu ";   break; //debugging micro?
        case -3:    prefix = "m";   break;
        case 0:     prefix = " ";    break;
        case 3:     prefix = "k";   break;
        case 6:     prefix = "M";   break;
        case 9:     prefix = "G";   break;
        case 12:    prefix = "T";   break;
        case 15:    prefix = "P";   break;
        default: break;
    }
    if(units == "m"){ //don't go above km for distances
        if(t_exp > 3){
            t_exp = 3;
            prefix = "k";
        }
    }
    var argument = value / Math.pow(10,t_exp);
    if(t_exp == 0){
        return argument.toPrecision(4)+units;
    }
    else{
        return argument.toPrecision(4)+prefix+units;
    }
}


function ComputePage(){
    console.log("computing page");
    //
}
//******************************************************************* DRAWING ****************************************** */
function DrawDistWithBackground(midx, midy,distinkm, ctx, color){
    ctx.fillStyle = "white";
    ctx.font = "12px Tahoma heavy";
    ctx.fillRect(midx-22,midy-5,65,10);
    ctx.fillStyle = color;
    ctx.fillText(distinkm.toFixed(2)+"km",midx-20,midy+5);
}
function UpdateCanvas(){
    var i;
    var thecanvas = document.getElementById("TheCanvas");
    var ctx = thecanvas.getContext("2d");
    //clears the canvas
    ctx.clearRect(0,0,thecanvas.width,thecanvas.height);
    //draw the grid
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    for(i=0; i < 10 ;i++){
        ctx.beginPath();
        ctx.moveTo(xstart + i*pxpergrid, ystart);
        ctx.lineTo(xstart + i*pxpergrid, ystart + 9*pxpergrid);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(xstart, ystart + i*pxpergrid);
        ctx.lineTo(xstart + 9*pxpergrid, ystart + i*pxpergrid);
        ctx.stroke();
        ctx.closePath();
    }
    //draw the hills as filled in gray circles & add text for heights
    for(i = 0; i < NUMDUDS; i++){
        var xcenter = gridToPixelx(ADUDX[i]);
        var ycenter = gridToPixely(ADUDY[i]);
        ctx.beginPath();
        ctx.fillStyle = "gray";
        ctx.arc(xcenter, ycenter, pxhillradius, 0, 2* Math.PI);
        ctx.fill();
        ctx.closePath();
        ctx.fillStyle = "black";
        ctx.font = "14px Tahoma Heavy";
        var height = ADUDH[i];
        ctx.fillText(height.toString(),xcenter-17,ycenter+5);
    }
    //draw the links between the hills (active only)
    if(vis_Links){
        ctx.lineWidth = 4;
        for(i = 0; i < numcommlinks; i++){
            if(A3commlinks[i] > 0){
                var color = "#D55"; //404 for purple
                if(b_cyberactive || commDisabled[i]){ //if cyber is active or if the link is down
                    color = "#777";
                }
                ctx.strokeStyle = color;
                var samfrom = maplinktosam(i,false);
                var samto   = maplinktosam(i, true);
                var xfrom = gridToPixelx(ASAMX[samfrom]);
                var yfrom = gridToPixely(ASAMY[samfrom]);
                var xto = gridToPixelx(ASAMX[samto]);
                var yto = gridToPixely(ASAMY[samto]);
                ctx.beginPath();
                ctx.moveTo(xfrom, yfrom);
                ctx.lineTo(xto,yto);
                ctx.stroke();
                ctx.closePath();
                if(vis_Dist){
                    var midx = (xfrom + xto) / 2.0;
                    var midy = (yfrom + yto) / 2.0;
                    var xdist = ASAMX[samfrom] - ASAMX[samto];
                    var ydist = ASAMY[samfrom] - ASAMY[samto];
                    var squared = xdist*xdist + ydist*ydist;
                    var distinkm = Math.sqrt(squared)*kmpergrid;
                    DrawDistWithBackground(midx, midy, distinkm, ctx, color);
                }
                if(b_simulating && b_cyberactive && b_crossover){
                    ctx.strokeStyle = "orange";
                    ctx.lineWidth = 7;
                    ctx.beginPath();
                    ctx.moveTo(xfrom, yfrom);
                    ctx.lineTo(xto,yto);
                    ctx.stroke();
                    ctx.closePath();
                }
            }
        }
    }
    //draw the sam sites as filled in green circles
    //draw the range rings for each site. If cyber or jamming, go gray
    ctx.lineWidth = 2;
    for(i = 0; i < NUMSITES; i++){
        var xcenter = gridToPixelx(ASAMX[i]);
        var ycenter = gridToPixely(ASAMY[i]);
        ctx.fillStyle = "green";
        if(samdisabled[i]){
            ctx.fillStyle = "#555";
        }
        ctx.beginPath();
        ctx.arc(xcenter, ycenter, pxhillradius, 0, 2* Math.PI);
        ctx.fill();
        ctx.closePath();
        if(vis_LOS == true){
            var radius = ASamVisToHorizon[i];
            var drawradius = radius * pxpergrid / kmpergrid;
            var color = "gray";
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.arc(xcenter, ycenter, radius, 0, 2* Math.PI);
            ctx.stroke();
            ctx.closePath();
            if(vis_Dist){
                DrawDistWithBackground(xcenter + drawradius, ycenter, drawradius, ctx, color);
            }
        }
        if(vis_Radar){
            var radius = A6SiteAcftDetRange[i][whichPackage]; //not Keyed. display student's input
            var drawradius = radius*pxpergrid/kmpergrid;
            var color = "blue";
            if(samdisabled[i] || b_cyberactive){// || b_jamactive){
                color = "#777";
            }
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.arc(xcenter, ycenter, drawradius, 0, 2* Math.PI);
            ctx.stroke();
            ctx.closePath();
            if(vis_Dist){
                DrawDistWithBackground(xcenter + drawradius, ycenter-20, drawradius, ctx, color);
            }
        }
        if(vis_Jam){
            var radius = ASiteAcftBurnRange[i][whichPackage];
            var drawradius = radius*pxpergrid/kmpergrid;
            var color = "red";
            if(samdisabled[i] || b_cyberactive){
                color = "black";
            }
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.arc(xcenter, ycenter, drawradius, 0, 2* Math.PI);
            ctx.stroke();
            ctx.closePath();
            if(vis_Dist){
                DrawDistWithBackground(xcenter + drawradius, ycenter, drawradius, ctx, color);
            }
        }
        ctx.fillStyle = "black";
        ctx.font = "14px Tahoma Heavy";
        ctx.fillText(ASAMH[i].toString(),xcenter-17,ycenter-4);
        ctx.fillText(ASAMNAMES[ASAMTYPE[i]],xcenter-27,ycenter+12);
    }
    //draw a mask to get rid of ring's overflow, but only top and bottom and left side so that right side radii show up
    ctx.fillStyle = "white";
    ctx.fillRect(0,0,thecanvas.width,ystart-1);
    ctx.fillRect(0,ystart+9*pxpergrid+1,thecanvas.width,thecanvas.height-ystart+9*pxpergrid+1);
    ctx.fillRect(0,ystart,xstart,thecanvas.height-ystart);
    //draw letters and numbers on the side of the grid
    ctx.fillStyle = "black";
    ctx.font = "20px Tahoma";
    for(i=0;i < 9; i++){
        ctx.fillText(letters[i], xstart - pxhalfgrid-5, ystart + (9-i)*pxpergrid - pxhalfgrid + 10);
        ctx.fillText(numbers[i], xstart + pxhalfgrid + i*pxpergrid - 6, ystart + 9*pxpergrid + pxhalfgrid);
    }
    //draw the flight plan 0..17 indexed
    if(vis_fplan){
        for(i = 0; i < 18; i++){
            var gridx, gridy, prevx, prevy;
            gridx = A9fplans[whichPackage][i];
            if(gridx < 1 || gridx > 9){
                break; //only the for-loop, done drawing
            }
            //cases for the y-value
            if(i < 9){
                gridy = i+1;
                prevy = gridy -1;
            }
            else{
                gridy = 18 - i;
                prevy = gridy + 1;
            }

            //special cases to set the x-value
            if(i == 0 || i == 9){
                prevx = gridx;
            }
            else{
                prevx = A9fplans[whichPackage][i-1];
            }
            ctx.beginPath();
            ctx.strokeStyle = "#F5F";
            ctx.lineWidth = 3;
            ctx.moveTo(gridToPixelx(prevx),gridToPixely(prevy));
            ctx.lineTo(gridToPixelx(gridx),gridToPixely(gridy));
            ctx.stroke();
            ctx.closePath();
            if(i == 8 || i == 17){
                //then also draw a line up to the top or bottom
                prevx = gridx;
                prevy = gridy;
                if(i == 8){
                    gridy = 10;
                }
                else{
                    gridy = 0;
                }
                ctx.beginPath();
                ctx.strokeStyle = "#F5F";
                ctx.lineWidth = 3;
                ctx.moveTo(gridToPixelx(prevx),gridToPixely(prevy));
                ctx.lineTo(gridToPixelx(gridx),gridToPixely(gridy));
                ctx.stroke();
                ctx.closePath();
            }
        }
    }
    ctx.font = "12px Tahoma";
    ctx.fillStyle = "black";
    ctx.fillText(combinednames,250,20); //just a progress counter
    //draw the jamming routine? add a status message
    ctx.font = "20px Tahoma";
    ctx.fillStyle = "black";
    if(b_jamactive && (b_simulating || b_showresults)){
        ctx.fillText("Jammer On",xstart,yend+60);
    }
    if(b_cyberactive  && (b_simulating || b_showresults)){
        ctx.fillText("Cyber Attack Active",xstart+120,yend+60);
    }
    //draw the HARM routine? -I hate the HARM Interface but fine
    //draw the airplane, and also validate whether the flight plan is legal
    if(b_simulating || b_showresults){
        var img;
        var bsouthbound = false;
        if(n_simstep >= FirstSouthbound){
            img = document.getElementById("myiconS");
            bsouthbound = true;
        }
        else{
            img = document.getElementById("myiconN");
        }
        var gridx = A9fplans[whichPackage][myActiveWaypointIndex];
        var gridy = myActiveWaypointGridy;
        var posx  = gridToPixelx(gridx);
        var posy  = gridToPixely(gridy);
        var ngridx = A9fplans[whichPackage][myNextWaypointIndex];
        var ngridy = myNextWaypointGridy;
        var nposx = gridToPixelx(ngridx);
        var nposy = gridToPixely(ngridy);
        var interpolatex = posx + n_simpartial*(nposx - posx);
        var interpolatey = posy + n_simpartial*(nposy - posy);
        if(gridx >= 1 && gridx <= 9){
            ctx.drawImage(img,interpolatex-15,interpolatey-15);
            if(Number.isNaN(ngridx))
                ctx.drawImage(img,posx-15,posy-15);
        }
        if(vis_LOS == true){
            var radius = AAcftVisToHorizon[whichPackage];
            var drawradius = radius * pxpergrid / kmpergrid;
            var color = "gray";
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.arc(interpolatex, interpolatey, radius, 0, 2* Math.PI);
            ctx.stroke();
            ctx.closePath();
            if(vis_Dist){
                DrawDistWithBackground(xcenter + drawradius, ycenter, drawradius, ctx, color);
            }
        }
        if(myActiveWaypointInPlay > 0 && b_crossover){
            //is airplane on a valid leg of a fplan?
            if(StepMaskCheckNext[n_simstep]){
                //is next move still within 1 cell?
                var griddiff = gridx - ngridx;
                if (griddiff < 0) griddiff = -griddiff;
                if(Number.isNaN(gridx)){
                    ExitMessage = "Waypoint is not a number";
                    HaltSimulation();
                }
                if (gridx < 1 || gridx > 9){
                    ExitMessage = "Waypoint not in range of 1..9";
                    HaltSimulation();
                }
                if (griddiff > 1 || ngridx < 1 || ngridx > 9 || Number.isNaN(ngridx)){
                    ExitMessage = "Cannot perform next move. Must be 45-diagonal or straight ahead";
                    if(Number.isNaN(ngridx)){
                        ExitMessage = "Oops, end of flight plan";
                    }
                    HaltSimulation();
                }
                //is next move going to repeat a cell from the ingress?
                if(bsouthbound){
                    var mirrorindex = StepToM[n_simstep];
                    var mirrorx = A9fplans[whichPackage][mirrorindex];
                    if(mirrorx == gridx){
                        ExitMessage = "A Strike Package cannot fly to the same point twice";
                        HaltSimulation();
                    }
                }
            }
            //did airplane hit dud dirt?
            for(var h = 0; h < NUMDUDS; h++){
                if(ADUDX[h] == gridx && ADUDY[h] == gridy && ADUDH[h] >= AALT[whichPackage]){
                    ExitMessage = "Terrain Blocking Flighpath";
                    HaltSimulation();
                }
            }
            //did airplane hit sam dirt?
            for(var h = 0; h < NUMSITES; h++){
                if(ASAMX[h] == gridx && ASAMY[h] == gridy && ASAMH[h] >= AALT[whichPackage]){
                    ExitMessage = "Terrain Blocking Flighpath";
                    HaltSimulation();
                }
            }
            //is airplane ordered to destory a SAM that is close enough?
            //and/or did airplane penetrate a WEZ?
            var b_ok = true;
            if(!b_cyberactive){
                for(var h = 0; h < NUMSITES; h++){
                    if(!samdisabled[h]){
                        var detrad = A6SiteAcftDetRange[h][whichPackage];
                        if(b_gradermode) detrad = K6SiteAcftDetRange[h][whichPackage]; //Keyed
                        var jamrad = ASiteAcftBurnRange[h][whichPackage];
                        if(b_gradermode) jamrad = KSiteAcftBurnRange[h][whichPackage]; //Keyed
                        var rawrad = A8RADARTypeAcftRaw[ASAMTYPE[h]][whichPackage];
                        if(b_gradermode) rawrad = K8RADARTypeAcftRaw[ASAMTYPE[h]][whichPackage]; //Keyed
                        var radx = gridToKm(ASAMX[h]);
                        var rady = gridToKm(ASAMY[h]);
                        var jetx = gridToKm(gridx);
                        var jety = gridToKm(gridy);
                        var deltax, deltay, checkx, checky;
                        var distance;
                        var stillontargetlist = false;
                        for(var t = 0; t < AHARMQTY[whichPackage]; t++){
                            if(HARMTargetList[whichPackage][t] == h && HARMShotSlots[whichPackage][t] > 0){
                                stillontargetlist = true;
                            }
                        }
                        for(var cx = 0; cx < 3; cx++){
                            checkx = jetx + (cx - 1)*pxpergrid/2;
                            deltax = radx - checkx;
                            for(var cy = 0; cy < 3; cy++){
                                checky = jety + (cy - 1)*pxpergrid/2;
                                deltay = rady - checky;
                                distance = Math.sqrt(deltax*deltax + deltay*deltay);
                                //can airplane jam this site?
                                var lineofsight = A5SiteAcftLOS[h][whichPackage];
                                if(b_gradermode) lineofsight = K5SiteAcftLOS[h][whichPackage];
                                if(b_jamactive && !samdisabled[h] && distance < rawrad && distance <= lineofsight){
                                    ctx.strokeStyle = "orange";
                                    ctx.lineWidth = 7;
                                    ctx.beginPath();
                                    ctx.moveTo(gridToPixelx(ASAMX[h]),gridToPixely(ASAMY[h]));
                                    ctx.lineTo(gridToPixelx(gridx),gridToPixely(gridy));
                                    ctx.stroke();
                                    ctx.closePath();
                                }
                                //can airplane hit site with harm on target list?
                                if(!samdisabled[h] && stillontargetlist && distance <= rawrad && distance <= lineofsight){
                                    samdisabled[h] = true;
                                    console.log("Harm fired");
                                    UpdateSitesAndCommLinksForDisabledSites();
                                    ctx.strokeStyle = "red";
                                    ctx.lineWidth = 3;
                                    ctx.beginPath();
                                    ctx.moveTo(gridToPixelx(ASAMX[h]),gridToPixely(ASAMY[h]));
                                    ctx.lineTo(gridToPixelx(gridx),gridToPixely(gridy));
                                    ctx.stroke();
                                    ctx.closePath();
                                }
                                //can site hit airplane in non-jamming scenario
                                if(!samdisabled[h] && distance <= detrad && !b_jamactive && b_ok == true){
                                    b_ok = false;
                                    ExitMessage = "Aircraft entered WEZ without ECM";
                                    ctx.beginPath();
                                    ctx.strokeStyle = "blue";
                                    ctx.lineWidth = 3;
                                    ctx.moveTo(gridToPixelx(ASAMX[h]),gridToPixely(ASAMY[h]));
                                    ctx.lineTo(gridToPixelx(gridx),gridToPixely(gridy));
                                    ctx.stroke();
                                    ctx.closePath();
                                    HaltSimulation();
                                }
                                //can site hit airplane in jamming scenario
                                if(!samdisabled[h] && distance <= jamrad && b_jamactive && b_ok == true){
                                    b_ok = false;
                                    ExitMessage = "Jamming inneffective";
                                    ctx.beginPath();
                                    ctx.strokeStyle = "red";
                                    ctx.lineWidth = 3;
                                    ctx.moveTo(gridToPixelx(ASAMX[h]),gridToPixely(ASAMY[h]));
                                    ctx.lineTo(gridToPixelx(gridx),gridToPixely(gridy));
                                    ctx.stroke();
                                    ctx.closePath();
                                    HaltSimulation();
                                }
                            }
                        }
                        
                    }
                }
            }
        }
    }
}
//************************************ (2) RADIO BUTTONS **********************************************************************
//REMOVED FEATURE
//************************************ (3) USER INTERFACE TAB, FLIGHT PLAN INTERACTION, TOGGLES **********************************
//this does not change the "whichpackage" variable, it only changes which tab is highlighted on the left tabs
function SetTabToPackage(){
    var TabName, tablinks, i;
    switch(whichPackage){
        case 0: TabName = 'TabConv';break;
        case 1: TabName = 'TabMix';break;
        case 2: TabName = 'TabStealth';break;
        default: break;
    }
    tablinks = document.getElementsByClassName("tablinks");
    for(i = 0; i < tablinks.length; i++){
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(TabName).className += " active";
}
function openTab(evt, whichTab){
    var i, tablinks;
    var rememberpackage = whichPackage;
    switch(whichTab){
        case 'TabConv':     whichPackage = 0; break;
        case 'TabMix':      whichPackage = 1; break;
        case 'TabStealth':  whichPackage = 2; break;
        default:            whichPackage = 0; break;
    }
    tablinks = document.getElementsByClassName("tablinks");
    for(i = 0; i < tablinks.length; i++){
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(whichTab).className += " active";
    //in response to a button click, update the canvas.
    if(rememberpackage != whichPackage){
        if(b_simulating){
            HaltSimulation();
        }
        b_showresults = false;
        UpdateCanvas();
    }
}
function SetViewTabsToDefault(){
    return; //for now, don't do defaults
    TurnDist(true);
    TurnLOS(false);
    TurnLinks(true);
    TurnRadar(true);
    TurnJam(true);
    TurnFPlan(true);
}
function toggleLOS(){
    TurnLOS(!vis_LOS);
    if(!b_simulating)
        UpdateCanvas();
}
function toggleDist(){
    TurnDist(!vis_Dist);
    if(!b_simulating)
        UpdateCanvas();
}
function toggleRadar(){
    TurnRadar(!vis_Radar);
    if(!b_simulating)
        UpdateCanvas();
}
function toggleJam(){
    TurnJam(!vis_Jam);
    if(!b_simulating)
        UpdateCanvas();
}
function toggleFPlan(){
    TurnFPlan(!vis_fplan);
    if(!b_simulating)
        UpdateCanvas();
}
function toggleLinks(){
    TurnLinks(!vis_Links);
    if(!b_simulating)
        UpdateCanvas();
}
function TurnLOS(setting){
    vis_LOS = setting;
    if(vis_LOS == true){
        document.getElementById("MaxLOS").className += " active";
    }
    else{ //in case the active gets duplicated, remove both with two calls to remove
        document.getElementById("MaxLOS").className = document.getElementById("MaxLOS").className.replace(" active","");
        document.getElementById("MaxLOS").className = document.getElementById("MaxLOS").className.replace(" active","");
    }
}
function TurnDist(setting){
    vis_Dist = setting;
    if(vis_Dist == true){
        document.getElementById("Distances").className += " active";
    }
    else{
        document.getElementById("Distances").className = document.getElementById("Distances").className.replace(" active","");
        document.getElementById("Distances").className = document.getElementById("Distances").className.replace(" active","");
    }
}
function TurnRadar(setting){
    vis_Radar = setting;
    if(vis_Radar == true){
        document.getElementById("MaxRadar").className += " active";
    }
    else{
        document.getElementById("MaxRadar").className = document.getElementById("MaxRadar").className.replace(" active","");
        document.getElementById("MaxRadar").className = document.getElementById("MaxRadar").className.replace(" active","");

    }
}
function TurnJam(setting){
    vis_Jam = setting;
    if(vis_Jam == true){
        document.getElementById("MinJam").className += " active";
    }
    else{
        document.getElementById("MinJam").className = document.getElementById("MinJam").className.replace(" active","");
        document.getElementById("MinJam").className = document.getElementById("MinJam").className.replace(" active","");

    }
}
function TurnLinks(setting){
    vis_Links = setting;
    if(vis_Links == true){
        document.getElementById("VisLinks").className += " active";
    }
    else{
        document.getElementById("VisLinks").className = document.getElementById("VisLinks").className.replace(" active","");
        document.getElementById("VisLinks").className = document.getElementById("VisLinks").className.replace(" active","");

    }
}
function TurnFPlan(setting){
    vis_fplan = setting;
    if(vis_fplan == true){
        document.getElementById("TogFPlan").className += " active";
    }
    else{
        document.getElementById("TogFPlan").className = document.getElementById("TogFPlan").className.replace(" active","");
        document.getElementById("TogFPlan").className = document.getElementById("TogFPlan").className.replace(" active","");

    }
}
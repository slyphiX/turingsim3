
/* 
 * View controller.
 * 
 * (c) 2016 jh
 */

//onerror = function (m, f, l) {
//    alert(m + "\nFile: " + f + "\nLine: " + l);
//};

onerror = function(m) {
    alert("ERROR: " + m + "\nReload the page to reset.");
};

addEventListener("load", function() {
    
    /* CONSTANTS */
    
    var TAPE_SIZE = 25;
    var TAPE_CENTER = Math.floor(TAPE_SIZE / 2);
    var TAPE = [];
    var LOG_LENGTH_THRESHOLD = 8;
    
    var DELAYS = [2000, 1000, 500, 300, 50];
    
    /* DOM ELEMENTS */
    
    var slidebutton = document.getElementById("clearprog");
    var slidebuttonout = document.getElementById("clearout");
    var edited = document.getElementById("editednote");
    var overlay = document.getElementById("overlay");
    var helpwrapper = document.getElementById("helpwrapper");
    var program = document.getElementById("program");
    var output = document.getElementById("output");
    var confirmoverlay = document.getElementById("confirmoverlay");
    var initial = document.getElementById("initial");
    var initialoffset = document.getElementById("initialoffset");
    var speedlist = document.getElementById("speed");
    var slider = document.getElementById("slider");
    
    /* TMS INSTANCE */
    
    var TMS = new TuringControl();
    var TV = new TapeView(TMS);
    
    /* MESSAGES */
        
    var PROGRAMMING_SUCCESS = "Machine programmed successfully.";
    var PROGRAMMING_STARTED = "Programming started...";
    var PROGRAMMING_EMPTY = "No programming entered!";
    var START_SUCCESS = "Machine started...";
    var RESET_SUCCESS = "Reset successful.";
    var COMPUTE_SUCCESS = "Computation started...";
    var HALT = "Machine halted: ";
    var HALT_INTERRUPT = HALT + "User interrupt.";
    var HALT_STATE = HALT + "Halt state reached.";
    var HALT_TIMEOUT = HALT + "Computation time limit exceeded.";
    
    /* METHODS */
        
    function init() {
        // set listeners
        program.addEventListener("input", updateProgramSlide);
        slidebuttonout.addEventListener("click", clearOutput);
        slidebutton.addEventListener("click", function() {
            confirmoverlay.className = "visible";
        });
        // TODO MAYBE CHANGE OVERLAY FADE-OUT TO ANIMATION (NOT TRANSITION)!
        document.getElementById("clear").addEventListener("click", clearProgram);
        document.getElementById("cancel").addEventListener("click", function() {
            confirmoverlay.className = "";
        });

        document.getElementById("overlay").addEventListener("click", hideOverlay);
        document.getElementById("help").addEventListener("click", showOverlay);
        
        speedlist.addEventListener("change", function() {
            TMS.delay = DELAYS[speedlist.selectedIndex];
        });
        
        slider.addEventListener("animationend", function() {
            slider.className = "";
        });
        
        document.getElementById("fullbutton").addEventListener("click", function() {
            TV.active = !TV.active;
            setClass(document.getElementById("fulltile"), "shown", TV.active);
        });
        
        document.getElementById("install").addEventListener("click", install);
        document.getElementById("start").addEventListener("click", start);
        document.getElementById("halt").addEventListener("click", halt);
        document.getElementById("reset").addEventListener("click", reset);
        document.getElementById("step").addEventListener("click", step);
        document.getElementById("calc").addEventListener("click", skip);
        
        TMS.addEventListener("uiupdate", updateUI);
        TMS.addEventListener("haltstate", () => message(HALT_STATE + "\n" + info()));
        TMS.addEventListener("runtimeerror", event => message(HALT + event.detail.message));
        TMS.addEventListener("skipdone", () => message("Computation successful."));
        TMS.addEventListener("skiptimeout", () => message(HALT_TIMEOUT + "\n" + info()));
        TMS.addEventListener("skipinterrupt", () => message(HALT_INTERRUPT + "\n" + info()));
        
        TMS.delay = DELAYS[speedlist.selectedIndex];
        
        // initialize tape
        document.getElementById("slider").style.width = (40 * TAPE_SIZE + 2) + "px";
        for (var i = 0; i < TAPE_SIZE; i++) {
            TAPE[i] = document.createElement("div");
            TAPE[i].className = "value";
            document.getElementById("slider").appendChild(TAPE[i]);
        }
    };
    init();
    
    lastPos = null;
    function updateUI() {
        // qol: make unclickable buttons look deactivated
        
        setStatusBar("state", TMS.state);
        setStatusBar("pos", TMS.position);
        setStatusBar("symbols", TMS.symbols);
        setStatusBar("transitions", TMS.transitions);
        
        setClass(document.getElementById("rightindicator"), "active", TMS.lastDirection === TMS.DIRECTION_RIGHT);
        setClass(document.getElementById("leftindicator"), "active", TMS.lastDirection === TMS.DIRECTION_LEFT);
        
        for (var i = 0; i < TAPE_SIZE; i++) {
            TAPE[i].textContent = TMS.getTape(TMS.position - TAPE_CENTER + i);
        }
        
        var duration = Math.floor(TMS.delay * 0.75);
        
        if (duration > 50) {
            slider.style.animationDuration = duration + "ms";
            if (TMS.lastDirection === TMS.DIRECTION_RIGHT)
                slider.className = "right";
            if (TMS.lastDirection === TMS.DIRECTION_LEFT)
                slider.className = "left";
        }
    }
    
    function install() {
        try {
            message(PROGRAMMING_STARTED);
            if (!program.value)
                throw new Error(PROGRAMMING_EMPTY);
            TMS.init(program.value, initial.value, initialoffset.value);
            message(PROGRAMMING_SUCCESS);
            lastInstalled = program.value;
            updateProgramSlide();
        } catch (e) {
            message("ERROR: " + e.message + "\nProgramming cancelled.");
        }
    }
    
    function start() {
        try {
            slider.className = "";
            TMS.start();
            message(START_SUCCESS);
        } catch (e) {
            message("ERROR: " + e.message);
        }
    }
    
    function halt() {
        try {
            var success = TMS.halt();
            if (success)
                message(HALT_INTERRUPT + "\n" + info());
        } catch (e) {
            message("ERROR: " + e.message);
        }
    }
    
    function reset() {
        try {
            TMS.reset();
            message(RESET_SUCCESS);
            slider.className = "";
        } catch (e) {
            message("ERROR: " + e.message);
        }
    }
    
    function step() {
        try {
            TMS.step();
        } catch (e) {
            message("ERROR: " + e.message);
        }
    }
    
    function skip() {
        try {
            TMS.compute();
            message(COMPUTE_SUCCESS);
        } catch (e) {
            message("ERROR: " + e.message);
        }
    }
    
    /* HELPER METHODS */
    
    function message(string, highlight) {
        var para = document.createElement("p");
        if (highlight)
            para.className = "em";
        para.innerHTML = timestamp() + " " + string.replace(/\n/g, "<br>");
        output.appendChild(para);
        updateOutputSlide();
    }
    function unify(num) {
        return (num < 10) ? "0" + num : num;
    }
    function timestamp() {
        var now = new Date();
        return "[" + unify(now.getHours()) +
               ":" + unify(now.getMinutes()) +
               ":" + unify(now.getSeconds()) + "]";
    }
    function info() {
        return TMS.transitions + " total transitions,\n" + TMS.symbols + " non-blank symbols on tape.";
    }
    
    var fontSize = len => 3/(len + 2) * 30 + "px";
    function setStatusBar(id, num) {
        var elem = document.getElementById(id);
        var str = String(num);
        if (str.length > LOG_LENGTH_THRESHOLD)
            str = num.toExponential(1).replace("+", "");
        elem.innerHTML = str;
        elem.style.fontSize = fontSize(str.length);
    }
    
    function setClass(elem, classname, on) {
        var classes = elem.className.split(" ");
        if (!on && classes.indexOf(classname) !== -1)
            classes.splice(classes.indexOf(classname), 1);
        if (on && classes.indexOf(classname) === -1)
            classes.push(classname);
        elem.className = classes.join(" ");
    }
    function showOverlay() {
        overlay.className = "visible";
        helpwrapper.className = "up";
        location.hash = "doc";
    }
    if (location.hash.search("doc") !== -1)
        showOverlay();
    
    function hideOverlay() {
        helpwrapper.className = "";
        overlay.className = "";
        location.hash = "";
    }
    
    var lastInstalled = "";
    // I had a dream that one day this expression would be rewritten as a lambda function...
    var clean = input => input.replace(/ *$|^ */gm, "").replace(/ +/g, " ")
                              .replace(/\n+/g, "\n").replace(/^\n*/, "").replace(/\n*$/, "");
    function updateProgramSlide() {
        setClass(edited, "shown", clean(lastInstalled) !== clean(program.value));
        setClass(slidebutton, "down", program.value !== "");
    }
    updateProgramSlide();
    function updateOutputSlide() {
        setClass(slidebuttonout, "down", output.childNodes.length !== 0);
    }
    
    function clearProgram() {
        program.value = "";
        updateProgramSlide();
        confirmoverlay.className = "";
    }
    function clearOutput() {
        while (output.lastChild)
            output.removeChild(output.lastChild);
        updateOutputSlide();
    }
    
});

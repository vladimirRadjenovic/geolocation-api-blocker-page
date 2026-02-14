(() => {
    const _getCurrentPosition = navigator.geolocation.getCurrentPosition;
    const _watchPosition = navigator.geolocation.watchPosition;
    const _clearWatch = navigator.geolocation.clearWatch;


    window.addEventListener("load", () => {
        const btnRunTest = document.getElementById("run-test");
        const output = document.getElementById("output");

        /*
        Good enough for first version. Maybe update later for better tampering detection when bypass is impossible.
        Out of 7 tested extensions 5 can be bypassed. One fails partially because it has a fully replaced Geolocation 
        object and the other one which passes completely uses the Chrome DevTools Protocol. 
        */
        function getCurrentPosition(gcp, options = undefined) {
            return new Promise((resolve, reject) => gcp.call(navigator.geolocation, resolve, reject, options));
        }

        function oneTimeWatchPosition(wp, cw, options = undefined) {
            return new Promise((resolve, reject) => {
                const id = wp.call(navigator.geolocation, pos => {
                    resolve(pos);
                    cw.call(navigator.geolocation, id);
                }, err => {
                    reject(err);
                    cw.call(navigator.geolocation, id);
                }, options);
            });
        }

        btnRunTest.addEventListener("click", async () => {
            btnRunTest.disabled = true;
            output.textContent = undefined;
            output.classList.remove("good-color");

            const gcpTemporal = _getCurrentPosition === navigator.geolocation.getCurrentPosition;
            const wpTemporal = _watchPosition === navigator.geolocation.watchPosition;

            const proto = Object.getPrototypeOf(navigator.geolocation);
            const gcpShape = proto.hasOwnProperty("getCurrentPosition") && !navigator.geolocation.hasOwnProperty("getCurrentPosition");
            const wpShape = proto.hasOwnProperty("watchPosition") && !navigator.geolocation.hasOwnProperty("watchPosition");

            if (gcpTemporal && gcpShape && wpTemporal && wpShape) {
                output.textContent = "Test passed.";
                output.classList.add("good-color");
                btnRunTest.disabled = false;
                return;
            }

            try {
                let position;
                if (!gcpTemporal) {
                    position = await getCurrentPosition(_getCurrentPosition);
                } else if (!gcpShape) {
                    position = await getCurrentPosition(proto.getCurrentPosition);
                } else if (!wpTemporal) {
                    position = await oneTimeWatchPosition(_watchPosition, _clearWatch);
                } else {
                    position = await oneTimeWatchPosition(proto.watchPosition, proto.clearWatch);
                };
                output.textContent = `Tampering detected, latitude: ${position.coords.latitude}, longitude: ${position.coords.longitude}.`;
            } catch (_err) {
                output.textContent = "Tampering detected, but an error occured while obtaining coordinates.";
            }
            btnRunTest.disabled = false;
        });
        
    });
})();
(function () {
    'use strict';

    var OldExceptionFormatter = getJasmineRequireObj().ExceptionFormatter(),
        oldExceptionFormatter = new OldExceptionFormatter();

    getJasmineRequireObj().ExceptionFormatter = function () {
        function ExceptionFormatter() {
            this.message = oldExceptionFormatter.message;
            this.stack = function (error) {
                var errorMsg = null;

                if (error /*&& !error.hasOwnProperty('stackTraceLimit')*/) {
                    errorMsg = error.stack.split('\n').slice(0, 10).join('\n');
                }

                return errorMsg;
            };
        }

        return ExceptionFormatter;
    };
}());

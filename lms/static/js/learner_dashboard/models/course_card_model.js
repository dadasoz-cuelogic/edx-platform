/**
 * Model for Course Programs.
 */
(function (define) {
    'use strict';
    define([
            'backbone'
        ], 
        function (Backbone) {
        return Backbone.Model.extend({
            initialize: function(data) {
                this.activeRunMode = null;
                if (data){
                    this.context = data;
                    //we should populate our model by looking at the run_modes
                    if (data.run_modes.length > 0){
                        if(data.run_modes.length === 1){
                            this.setActiveRunMode(data.run_modes[0]);
                        }
                        else{
                            this.setActiveRunMode(
                                this.getMostRecentRunMode(data.run_modes));
                        }
                    }
                }
            },

            getMostRecentRunMode: function(runModes){
                //Need to expand this function to retrieve
                //the most relevant runmode for the course
                return runModes[0];
            },

            getActiveRunMode: function(){
                return this.activeRunMode;
            },

            setActiveRunMode: function(runMode){
                this.activeRunMode = runMode;
                this.set({
                    display_name: this.context.display_name,
                    key: this.context.key,
                    marketing_url: runMode.marketing_url || '',
                    start_date: runMode.start_date,
                    end_date: runMode.end_date,
                    is_enrolled: runMode.is_enrolled,
                    is_enrollment_open: runMode.is_enrollment_open,
                    course_key: runMode.course_key,
                    course_url: runMode.course_url || '',
                    course_image_url: runMode.course_image_url || '',
                    mode_slug: runMode.mode_slug
                });
            },

            updateRun: function(runKey){
                var selectedRun = _.findWhere(this.get('run_modes'), {run_key: runKey});
                if(selectedRun){
                    this.setActiveRunMode(selectedRun);
                }
            }
        });
    });
}).call(this, define || RequireJS.define);

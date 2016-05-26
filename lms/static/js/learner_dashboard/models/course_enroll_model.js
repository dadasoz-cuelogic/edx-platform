/**
 *  Track optIn status and submit form
 */
;(function (define) {
    'use strict';

    define([
            'backbone',
            'jquery',
            'underscore'
        ],
        function( Backbone, $, _ ) {
            return Backbone.Model.extend({
                defaults: {
                    course_id: '',
                    optIn: false,
                    enrolled: false,
                },

                initialize: function( attributes, options ) {
                    var api = '/api/commerce/v0/baskets/';

                    this.set({
                        course_id: options.courseId,
                    });

                    this.url = api;
                    this.trackSelectionUrl = '/course_modes/choose/';
                    this.dashboardUrl = '/dashboard';
                    this.verificationUrl = '/verify_student/start-flow/';
                    this.csrfCookieName = 'csrftoken';
                },


                /**
                 *  Enroll in a course
                 */
                enroll: function( track ) {
                    var data = {
                            course_id: this.get('course_id'),
                            email_opt_in: this.get('optIn')
                        };

                    $.ajax({
                        type: 'POST',
                        url: this.url,
                        data: JSON.stringify(data),
                        contentType: 'application/json; charset=utf-8',
                        context: this,
                        success: function() {
                            if ( track ) {
                                if ( track === 'honor' || track === 'audit' ) {
                                    this.set({
                                        enrolled: true
                                    });
                                } else  {
                                    // Go to the start of the verification flow
                                    this.redirect( this.verificationUrl + this.get('course_id') + '/' );
                                }
                            } else {
                                // Go to track selection page
                                this.redirect( this.trackSelectionUrl + this.get('course_id') );
                            }
                        },
                        error: _.bind( this.enrollError, this )
                    });
                },

                enrollError: function( jqXHR ) {
                    // Current implementation from logistration
                    var responseData = JSON.parse( jqXHR.responseText );

                    if ( jqXHR.status === 403 && responseData.user_message_url ) {
                        /**
                         * Check if we've been blocked from the course
                         * because of country access rules.
                         * If so, redirect to a page explaining to the user
                         * why they were blocked.
                         */
                        this.redirect( responseData.user_message_url );
                    } else {
                        /**
                         * Otherwise, go to the track selection page as usual.
                         * This can occur, for example, when a course does not
                         * have a free enrollment mode, so we can't auto-enroll.
                         */
                        this.redirect( this.trackSelectionUrl + this.get('course_id') );
                    }
                },

                redirect: function( url ) {
                    window.location.href = url;
                }
            });
        }
    );
}).call(this, define || RequireJS.define);
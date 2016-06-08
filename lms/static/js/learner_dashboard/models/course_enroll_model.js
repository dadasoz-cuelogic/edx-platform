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
                },
                urlRoot: '/api/commerce/v0/baskets/'
            });
        }
    );
}).call(this, define || RequireJS.define);

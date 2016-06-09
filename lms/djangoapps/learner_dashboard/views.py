"""Learner dashboard views"""
from urlparse import urljoin

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core.urlresolvers import reverse
from django.http import Http404
from django.views.decorators.http import require_GET

from edxmako.shortcuts import render_to_response
from openedx.core.djangoapps.credentials.utils import get_programs_credentials
from openedx.core.djangoapps.programs.models import ProgramsApiConfig
from openedx.core.djangoapps.programs import utils
from lms.djangoapps.learner_dashboard.utils import (
    FAKE_COURSE_ID_FOR_URL,
    url_remove_fake_course_id
)


@login_required
@require_GET
def view_programs(request):
    """View programs in which the user is engaged."""
    show_program_listing = ProgramsApiConfig.current().show_program_listing
    if not show_program_listing:
        raise Http404

    meter = utils.ProgramProgressMeter(request.user)
    programs = meter.engaged_programs

    # TODO: Pull 'xseries' string from configuration model.
    marketing_root = urljoin(settings.MKTG_URLS.get('ROOT'), 'xseries').strip('/')
    for program in programs:
        program['display_category'] = utils.get_display_category(program)
        program['marketing_url'] = '{root}/{slug}'.format(
            root=marketing_root,
            slug=program['marketing_slug']
        )

    context = {
        'programs': programs,
        'progress': meter.progress,
        'xseries_url': marketing_root if ProgramsApiConfig.current().show_xseries_ad else None,
        'nav_hidden': True,
        'show_program_listing': show_program_listing,
        'credentials': get_programs_credentials(request.user, category='xseries'),
        'disable_courseware_js': True,
        'uses_pattern_library': True
    }

    return render_to_response('learner_dashboard/programs.html', context)


@login_required
@require_GET
def program_details(request, program_id):
    """View details about a specific program."""
    show_program_details = ProgramsApiConfig.current().show_program_details
    if not show_program_details:
        raise Http404

    program_data = utils.get_programs(request.user, program_id=program_id)

    if not program_data:
        raise Http404

    program_data = utils.supplement_program_data(program_data, request.user)
    show_program_listing = ProgramsApiConfig.current().show_program_listing

    urls = {
        'program_listing_url': reverse('program_listing_view'),
        'dashboard_url': reverse('dashboard'),
        'track_selection_url': url_remove_fake_course_id(
            reverse('course_modes_choose', kwargs={'course_id': FAKE_COURSE_ID_FOR_URL})),
        'id_verification_url': url_remove_fake_course_id(
            reverse('verify_student_start_flow', kwargs={'course_id': FAKE_COURSE_ID_FOR_URL}))
    }

    context = {
        'program_data': program_data,
        'urls': urls,
        'show_program_listing': show_program_listing,
        'nav_hidden': True,
        'disable_courseware_js': True,
        'uses_pattern_library': True
    }

    return render_to_response('learner_dashboard/program_details.html', context)

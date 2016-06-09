""" Unit test module covering utils module
"""

import ddt
from django.test import TestCase

from lms.djangoapps.learner_dashboard.utils import (
    FAKE_COURSE_ID_FOR_URL,
    url_remove_fake_course_id)


@ddt.ddt
class TestUrlRemoveFakeId(TestCase):
    """ The test case class covering the util function 'url_remove_fake_course_id'
    """
    @ddt.data(['path1'], ['path1', 'path2'], [])
    def test_remove_fake_id_from_url(self, path_array):
        """ Test to make sure the function 'url_remove_fake_course_id'
        handles various url input
        """
        input_path = list(path_array)
        input_path.append(FAKE_COURSE_ID_FOR_URL)
        url = '/'.join(input_path) + '/'
        url_removed = url_remove_fake_course_id(url)
        expected_url = ''
        if path_array:
            expected_url = '/'.join(path_array) + '/'
        self.assertEqual(url_removed, expected_url)

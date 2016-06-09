""" The utility methods and functions to help the djangoapp logic
"""
from urlparse import urlparse


FAKE_COURSE_ID_FOR_URL = 'course/replace+1'


def url_remove_fake_course_id(url_string):
    """ The utility function to help remove the fake
    course ID from the url string
    """
    parsed_url = urlparse(url_string)
    url_path = parsed_url.path
    if url_path[-1] == '/':
        url_path = url_path[:-1]
    updated_path = url_path.replace(FAKE_COURSE_ID_FOR_URL, '')
    parsed_url = parsed_url._replace(path=updated_path)
    return parsed_url.geturl()     # pylint: disable=no-member

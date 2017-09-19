import os
import requests

from django.contrib.auth.decorators import login_required
from django.core.files.storage import default_storage
from django.shortcuts import render
from django.http import HttpResponseRedirect
from django.core.urlresolvers import reverse
from django.http import JsonResponse

from compare.models import *
from compare.models import Compare
import compare.utils as utils

from perma.models import Link
from htmldiffer import diff
from htmldiffer import settings as diff_settings
from warc_compare import WARCCompare, utils as wc_utils

@login_required
def capture_create(request, old_guid):
    """
    here, we want to grab the guid coming in, and create a new archive of it
    we then do a diff on that archive using diff.warc_compare_text
    """

    old_archive = Link.objects.get(guid=old_guid)
    api_url = "http://localhost:8000/api/v1/archives/?api_key=%s" % settings.DIFF_API_KEY
    response = requests.post(api_url, data={'url': old_archive.submitted_url})
    # limitation: can only compare public links for now
    # maybe this is solved by temporarily allowing users to view, until archive gets deleted or transferred over

    # create link using diff_user@example.com's api key
    # move warc over the actual user if they want to keep it
    # all warcs should be deleted forever from diff user every 24 hours

    # old_archive = Link.objects.get(guid=guid)

    new_guid = response.json().get('guid')
    compare = Compare(original_guid=old_guid, guid=new_guid, created_by=old_archive.created_by)
    compare.save()
    # old_archive = Link.objects.get(guid="AA3S-SQ55")
    # new_archive = Link.objects.get(guid=new_guid)

    # context = { 'old_guid': old_guid, 'new_guid': new_guid }
    return HttpResponseRedirect(reverse('capture_compare', kwargs={ 'old_guid': old_guid, 'new_guid': new_guid}))

def capture_compare(request, old_guid, new_guid):
    protocol = "https://" if settings.SECURE_SSL_REDIRECT else "http://"

    if request.GET.get('type'):
        # if type "image", serve here
        return
    else:
        # check if comparison directory exists yet
        old_archive = Link.objects.get(guid=old_guid)
        new_archive = Link.objects.get(guid=new_guid)
        old_warc_path = os.path.join(default_storage.base_location, old_archive.warc_storage_file())
        new_warc_path = os.path.join(default_storage.base_location, new_archive.warc_storage_file())
        wc = WARCCompare(old_warc_path, new_warc_path)

        # if not utils.compare_dir_exists(old_guid, new_guid):
        """
        create new comparison directory for these two guids
        """
        utils.create_compare_dir(old_guid, new_guid)

        html_one = old_archive.replay_url(old_archive.submitted_url).data
        html_two = new_archive.replay_url(new_archive.submitted_url).data

        rewritten_html_one = utils.rewrite_html(html_one, old_archive.guid)
        rewritten_html_two = utils.rewrite_html(html_two, new_archive.guid)

        # ignore guids in html
        diff_settings.EXCLUDE_STRINGS_A.append(str(old_guid))
        # diff_settings.EXCLUDE_STRINGS_A.append(str(old_guid))
        diff_settings.EXCLUDE_STRINGS_B.append(str(new_guid))

        # add own style string
        diff_settings.STYLE_STR = settings.DIFF_STYLE_STR

        diffed = diff.HTMLDiffer(rewritten_html_one, rewritten_html_two)

        # TODO: change all '/' in url to '_' to save
        import ipdb; ipdb.set_trace()
        utils.write_to_static(diffed.deleted_diff, 'deleted.html', old_guid, new_guid)
        utils.write_to_static(diffed.inserted_diff, 'inserted.html', old_guid, new_guid)
        utils.write_to_static(diffed.combined_diff, 'combined.html', old_guid, new_guid)

        total_count, unchanged_count, missing_count, added_count, modified_count = wc.count_resources()
        resources = []
        for status in wc.resources:
            for content_type in wc.resources[status]:
                if "javascript" in content_type:
                    content_type_str = "script"
                elif "image" in content_type:
                    content_type_str = "img"
                elif "html" in content_type:
                    content_type_str = "html"
                else:
                    content_type_str = content_type
                for url in wc.resources[status][content_type]:
                    resource = {
                        'url': url,
                        'content_type': content_type_str,
                        'status': status,
                    }
                    if url == old_archive.submitted_url:
                        resources = [resource] + resources
                    else:
                        resources.append(resource)


        context = {
            'old_archive': old_archive,
            'new_archive': new_archive,
            'old_archive_capture': old_archive.primary_capture,
            'new_archive_capture': new_archive.primary_capture,
            'this_page': 'comparison',
            'link_url': settings.HOST + '/' + old_archive.guid,
            'protocol': protocol,
            'resources': resources,
            'resource_count': {
                'total': total_count[1],
                'unchanged': unchanged_count,
                'missing': missing_count,
                'added': added_count,
                'modified': modified_count,
            },
        }

        return render(request, 'comparison.html', context)

def image_compare(request, old_guid, new_guid):
    return render(request)

def list(request, old_guid):
    protocol = "https://" if settings.SECURE_SSL_REDIRECT else "http://"

    compared_archives = Compare.objects.filter(original_guid=old_guid)
    old_archive = Link.objects.get(pk=old_guid)

    context = {
        'old_archive': old_archive,
        'archives': compared_archives,
        'protocol': protocol,
    }

    return render(request, 'list.html', context)

def get_resource_list(request, old_guid, new_guid):
    old_archive = Link.objects.get(guid=old_guid)
    new_archive = Link.objects.get(guid=new_guid)
    old_warc_path = os.path.join(default_storage.base_location, old_archive.warc_storage_file())
    new_warc_path = os.path.join(default_storage.base_location, new_archive.warc_storage_file())
    wc = WARCCompare(old_warc_path, new_warc_path)

    ### TODO: ordering

    similarity = wc.calculate_similarity()
    resources = []
    for status in wc.resources:
        for content_type in wc.resources[status]:
            urls = wc.resources[status][content_type]
            for url in urls:
                resource = {
                    'url':url,
                    'content_type': content_type,
                    'status': status,
                }

                if status == 'modified' and 'image' not in content_type:
                    resource['simhash'] = similarity[url]['simhash']
                    resource['minhash'] = similarity[url]['minhash']

                if url == old_archive.submitted_url:
                    resources.insert(0, resource)
                else:
                    resources.append(resource)


    return JsonResponse(resources, safe=False)

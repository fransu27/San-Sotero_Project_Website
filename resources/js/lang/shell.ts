/** Words for the logged-in shell: top bar, sidebar, settings tabs, banner, feed headings. tl / ceb must contain every key of en. */
export const en = {
    'nav.search': 'Search reports…',
    'nav.newsfeed': 'Newsfeed',
    'nav.reportsAdmin': 'All reports',
    'nav.reportsResident': 'Community reports',
    'nav.categories': 'Categories',
    'nav.settings': 'Settings',
    'nav.main': 'Main navigation',
    'nav.filters': 'Filters',
    'nav.account': 'Account menu',
    'nav.logout': 'Log out',

    'set.title': 'Settings',
    'set.desc': 'Manage your profile, password and how the site looks.',
    'set.profile': 'Profile',
    'set.security': 'Security',
    'set.appearance': 'Appearance',
    'set.barangay': 'Barangay',

    'banner.placeholderTitle': 'Barangay location photo',
    'banner.placeholderHint':
        'No photo yet. It will appear here once the barangay adds one.',
    'banner.adminHint': 'Add a photo in Settings → Barangay',

    'feed.showing': 'Showing {what}',
    'feed.results': 'results for “{q}”',
    'feed.clear': 'Clear filter',
    'feed.emptyFiltered': 'No reports match this filter.',
    'feed.emptyAdmin': 'No reports yet. Residents’ reports will appear here.',
    'feed.emptyResident':
        'No reports to show yet. Use the box above to tell the barangay about a concern.',
    'widget.admin': 'Reports overview',
    'widget.resident': 'Community reports',
    'widget.total': 'Total',
    'widget.privacy':
        'Posts set to Private are visible only to you and the barangay officials.',

    'brgy.title': 'Barangay details',
    'brgy.desc':
        'Set the name, a short caption and a location photo of your barangay. It replaces the default banner on the dashboard and settings pages.',
    'brgy.name': 'Barangay name',
    'brgy.caption': 'Short caption',
    'brgy.captionPh': 'e.g. Purok 1 to 7, Municipality of Abuyog',
    'brgy.photo': 'Location photo',
    'brgy.choose': 'Choose photo',
    'brgy.change': 'Change photo',
    'brgy.remove': 'Remove photo',
    'brgy.hint': 'JPG, PNG or WebP · up to 4 MB · wide photos look best',
    'brgy.save': 'Save',
    'brgy.saving': 'Saving…',
    'brgy.tooBig': 'That photo is over 4 MB. Choose a smaller one.',
    'brgy.badType': 'Please choose a JPG, PNG or WebP photo.',

    'auth.headline': 'A louder voice for every purok of {place}.',
    'auth.p1': 'Report a problem with a photo and a short description.',
    'auth.p2':
        'Follow it from Pending to Resolved and read barangay announcements.',
    'auth.p3':
        'Choose who sees your report: everyone, or the barangay only. You can even hide your name.',
    'auth.back': '← Back to home',
} as const;

export const tl: Record<keyof typeof en, string> = {
    'nav.search': 'Maghanap ng ulat…',
    'nav.newsfeed': 'Newsfeed',
    'nav.reportsAdmin': 'Lahat ng ulat',
    'nav.reportsResident': 'Mga ulat ng komunidad',
    'nav.categories': 'Mga Kategorya',
    'nav.settings': 'Mga Setting',
    'nav.main': 'Pangunahing nabigasyon',
    'nav.filters': 'Mga filter',
    'nav.account': 'Menu ng account',
    'nav.logout': 'Mag-log out',

    'set.title': 'Mga Setting',
    'set.desc': 'Pamahalaan ang iyong profile, password at hitsura ng site.',
    'set.profile': 'Profile',
    'set.security': 'Seguridad',
    'set.appearance': 'Hitsura',
    'set.barangay': 'Barangay',

    'banner.placeholderTitle': 'Larawan ng lokasyon ng barangay',
    'banner.placeholderHint':
        'Wala pang larawan. Lalabas ito dito kapag nag-upload ang barangay.',
    'banner.adminHint': 'Magdagdag ng larawan sa Mga Setting → Barangay',

    'feed.showing': 'Ipinapakita: {what}',
    'feed.results': 'mga resulta para sa “{q}”',
    'feed.clear': 'I-clear ang filter',
    'feed.emptyFiltered': 'Walang ulat na tumutugma sa filter na ito.',
    'feed.emptyAdmin':
        'Wala pang ulat. Lalabas dito ang mga ulat ng mga residente.',
    'feed.emptyResident':
        'Wala pang maipapakitang ulat. Gamitin ang kahon sa itaas para ipaalam sa barangay ang iyong alalahanin.',
    'widget.admin': 'Pangkalahatang-ideya ng mga ulat',
    'widget.resident': 'Mga ulat ng komunidad',
    'widget.total': 'Kabuuan',
    'widget.privacy':
        'Ang mga post na naka-Private ay makikita lamang mo at ng mga opisyal ng barangay.',

    'brgy.title': 'Detalye ng barangay',
    'brgy.desc':
        'Itakda ang pangalan, maikling caption at larawan ng lokasyon ng barangay. Papalitan nito ang default na banner sa dashboard at settings.',
    'brgy.name': 'Pangalan ng barangay',
    'brgy.caption': 'Maikling caption',
    'brgy.captionPh': 'hal. Purok 1 hanggang 7, Bayan ng Abuyog',
    'brgy.photo': 'Larawan ng lokasyon',
    'brgy.choose': 'Pumili ng larawan',
    'brgy.change': 'Palitan ang larawan',
    'brgy.remove': 'Alisin ang larawan',
    'brgy.hint':
        'JPG, PNG o WebP · hanggang 4 MB · mas maganda ang malapad na larawan',
    'brgy.save': 'I-save',
    'brgy.saving': 'Sine-save…',
    'brgy.tooBig': 'Lampas 4 MB ang larawan. Pumili ng mas maliit.',
    'brgy.badType': 'Pumili ng larawang JPG, PNG o WebP.',

    'auth.headline': 'Mas malakas na tinig para sa bawat purok ng {place}.',
    'auth.p1': 'Mag-ulat ng problema na may larawan at maikling paglalarawan.',
    'auth.p2':
        'Sundan ito mula Nakabinbin hanggang Nalutas at basahin ang mga anunsyo ng barangay.',
    'auth.p3':
        'Piliin kung sino ang makakakita ng ulat mo: lahat, o barangay lamang. Maaari mo ring itago ang pangalan mo.',
    'auth.back': '← Bumalik sa home',
};

export const ceb: Record<keyof typeof en, string> = {
    'nav.search': 'Pangita og report…',
    'nav.newsfeed': 'Newsfeed',
    'nav.reportsAdmin': 'Tanang report',
    'nav.reportsResident': 'Mga report sa komunidad',
    'nav.categories': 'Mga Kategorya',
    'nav.settings': 'Mga Setting',
    'nav.main': 'Panguna nga navigation',
    'nav.filters': 'Mga filter',
    'nav.account': 'Menu sa account',
    'nav.logout': 'Pag-log out',

    'set.title': 'Mga Setting',
    'set.desc': 'Dumalaha ang imong profile, password ug hitsura sa site.',
    'set.profile': 'Profile',
    'set.security': 'Seguridad',
    'set.appearance': 'Hitsura',
    'set.barangay': 'Barangay',

    'banner.placeholderTitle': 'Litrato sa lugar sa barangay',
    'banner.placeholderHint':
        'Wala pay litrato. Makita kini dinhi kung mag-upload ang barangay.',
    'banner.adminHint': 'Magdugang og litrato sa Mga Setting → Barangay',

    'feed.showing': 'Gipakita: {what}',
    'feed.results': 'mga resulta para sa “{q}”',
    'feed.clear': 'I-clear ang filter',
    'feed.emptyFiltered': 'Walay report nga motugma niini nga filter.',
    'feed.emptyAdmin':
        'Wala pay report. Makita dinhi ang mga report sa mga residente.',
    'feed.emptyResident':
        'Wala pay mapakita nga report. Gamita ang kahon sa ibabaw aron ipahibalo sa barangay ang imong problema.',
    'widget.admin': 'Katingbanan sa mga report',
    'widget.resident': 'Mga report sa komunidad',
    'widget.total': 'Kinatibuk-an',
    'widget.privacy':
        'Ang mga post nga Private makita ra nimo ug sa mga opisyal sa barangay.',

    'brgy.title': 'Detalye sa barangay',
    'brgy.desc':
        'Itakda ang ngalan, mubo nga caption ug litrato sa lugar sa barangay. Ilisan niini ang default nga banner sa dashboard ug settings.',
    'brgy.name': 'Ngalan sa barangay',
    'brgy.caption': 'Mubo nga caption',
    'brgy.captionPh': 'pananglitan Purok 1 hangtod 7, Lungsod sa Abuyog',
    'brgy.photo': 'Litrato sa lugar',
    'brgy.choose': 'Pili og litrato',
    'brgy.change': 'Ilisi ang litrato',
    'brgy.remove': 'Kuhaa ang litrato',
    'brgy.hint':
        'JPG, PNG o WebP · hangtod 4 MB · mas nindot ang lapad nga litrato',
    'brgy.save': 'I-save',
    'brgy.saving': 'Nag-save…',
    'brgy.tooBig': 'Lapas sa 4 MB ang litrato. Pili og mas gamay.',
    'brgy.badType': 'Pili og JPG, PNG o WebP nga litrato.',

    'auth.headline': 'Mas kusog nga tingog para sa matag purok sa {place}.',
    'auth.p1':
        'Mag-report og problema nga naay litrato ug mubo nga paghulagway.',
    'auth.p2':
        'Sunda kini gikan sa Naghulat hangtod Nasulbad ug basaha ang mga pahibalo sa barangay.',
    'auth.p3':
        'Pili kung kinsa ang makakita sa imong report: tanan, o barangay lang. Mahimo pud nimong tagoon ang imong ngalan.',
    'auth.back': '← Balik sa home',
};

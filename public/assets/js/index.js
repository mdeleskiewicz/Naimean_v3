    (() => {
      const perfApi = window.performance;
      perfApi?.mark?.('naimean-js-boot-start');
      const DESIGN_HEIGHT = 2160;
      const TILE_WIDTH = 3840;
      const SCENE_OFFSET_X = TILE_WIDTH;
      const DESK_CENTER_X = SCENE_OFFSET_X + 1689; // Lower monitor bank center: ((left x=1331) + (right edge=1758+288)) / 2 ≈ 1688.5.
      const WHEEL_SCROLL_MULTIPLIER = 2.2;
      const LINE_SCROLL_PIXELS = 40;
      const DOM_DELTA_LINE = 1;
      const DOM_DELTA_PAGE = 2;
      const DRAG_START_THRESHOLD_PX = 8;
      const CAMERA_SMOOTHING_FACTOR = 0.22;
      const CAMERA_SETTLE_EPSILON = 0.05;
      const HOTSPOT_CLICK_SUPPRESSION_MS = 400;
      const HOTSPOT_API_PATH = '/api/hotspots';
      const SAVE_RESULT_FLASH_KEY = 'den_hotspot_save_result';
      const LEGACY_HOTSPOT_API_PATH = '/api/data';
      const LEGACY_HOTSPOT_RECORD_TITLE = 'den-hotspots-v3';
      const SAVE_BUTTON_RESET_MS = 2000;
      const COMMODORE_MONITOR_TURN_ON_MS = 2000;
      const API_TIMEOUT_MS = 5000;
      const MONITOR_POWER_CASCADE_MS = 4000;
      const MONITOR_INTERACTIVE_POLL_INTERVAL_MS = 500;
      const MONITOR_INTERACTIVE_BUFFER_MS = 1000;
      const BIG_TV_MONITOR_INTERACTIVE_WAIT_TIMEOUT_MS =
        COMMODORE_MONITOR_TURN_ON_MS + MONITOR_POWER_CASCADE_MS + MONITOR_INTERACTIVE_BUFFER_MS;
      const SAVE_RETRY_ATTEMPTS = 3;
      const SAVE_RETRY_DELAY_MS = 350;
      const TOUCH_MOMENTUM_DECAY = 0.004;
      const TOUCH_MOMENTUM_MIN_VELOCITY = 0.02;
      const NOAHS_ARCADE_URL = '/noahs-arcade.html';
      const COMMODORE_URL = '/commodore.html';
      const COMMODORE_NAV_SOURCE_STORAGE_KEY = 'commodore.navigation.source.v1';
      const COMMODORE_POWER_STATE_STORAGE_KEY = 'commodore.screen.poweredOn.v1';
      const COMMODORE_NAV_SOURCE_DEN = 'den';
      const CHAPEL_URL = '/chapel.html';
      const NOAHS_ARCADE_HOTSPOT_ID = 'noahs-arcade';
      const FIRST_TILE_HOTSPOT_IDS = new Set([NOAHS_ARCADE_HOTSPOT_ID]);
      const DESKTOP_DRAG_SCROLL_MULTIPLIER = 1;
      const MOBILE_DRAG_SCROLL_MULTIPLIER = 2;
      const MICROSOFT_WHITEBOARD_URL = 'https://whiteboard.cloud.microsoft/?lng=en-us&ref=oib-8ad27b9b-cce3-40c7-b658-b40c8163d34a';
      const SERVICE_NOW_ASSIGNED_WORK_URL =
        'https://recoverycoa.service-now.com/now/nav/ui/classic/params/target/incident_list.do?sysparm_query=stateNOT%20IN6%2C7%2C8%5Eassigned_to%3D7fc866ea1b1d7110153886a7624bcbc0&sysparm_first_row=1';
      const WHITEBOARD_HOTSPOT_URLS = Object.freeze({
        whiteboard: MICROSOFT_WHITEBOARD_URL,
        'rca-board': MICROSOFT_WHITEBOARD_URL,
        'cap-ex': 'https://app.smartsheet.com/b/form/70b07591b76a4289bc6f5d5e1aabac91',
        'snow-tickets': SERVICE_NOW_ASSIGNED_WORK_URL,
        'ntst-cases':
          'https://support.netsmartconnect.com/solutionsupport?id=ntst_csm_cases&table=sn_customerservice_case&view=app_support&fixed_query=active%3Dtrue%5Econtact%3Djavascript%3Ags.getUserID()&o=sys_updated_on&d=desc',
        'jira-board': 'https://teamrca.atlassian.net/jira/software/projects/CA/boards/77?jql=assignee%20%3D%206228f47414cd2400690bf259',
        'change-mgmt': 'https://recoverycoa.service-now.com/now/nav/ui/classic/params/target/sn_chg_model_ui_landing.do',
        'change-mgmt-open':
          'https://recoverycoa.service-now.com/now/nav/ui/classic/params/target/change_request_list.do%3Fsysparm_userpref_module%3Dcd579a82c0a8016400aa77d97a4d70a8%26sysparm_query%3Dactive%253Dtrue%255EEQ%26active%3Dtrue'
      });
      const WHITEBOARD_TASK_HOTSPOTS = [
        { id: 'cap-ex', label: 'Cap-Ex', x: 772, y: 462, w: 402, h: 120 },
        { id: 'snow-tickets', label: 'SNOW Tickets', x: 772, y: 614, w: 402, h: 120 },
        { id: 'ntst-cases', label: 'NTST Cases', x: 772, y: 766, w: 402, h: 120 },
        { id: 'jira-board', label: 'JIRA Board', x: 772, y: 918, w: 402, h: 120 },
        { id: 'change-mgmt', label: 'Change Mgmt New', x: 772, y: 1070, w: 402, h: 120 },
        { id: 'change-mgmt-open', label: 'Change Mgmt Open', x: 772, y: 1222, w: 402, h: 120 }
      ];
      const WHITEBOARD_HOTSPOT_IDS = new Set([
        'rca-board',
        'whiteboard',
        ...WHITEBOARD_TASK_HOTSPOTS.map((spot) => spot.id)
      ]);
      const HOTSPOT_READABLE_LABELS = new Map([
        ['chapel', 'Chapel'],
        ...WHITEBOARD_TASK_HOTSPOTS.map(({ id, label }) => [id, label])
      ]);
      const AQUARIUM_HOTSPOT_IDS = new Set(['aquarium']);
      const NEDRY_GATE_TRIGGER_HOTSPOT_IDS = new Set([
        'overlay-big-tv-control',
        'right-monitor'
      ]);
      const DEFAULT_BIG_TV_RIGHT_MONITOR_OVERLAY_STATE = 'blue_discord';
      const BIG_TV_RIGHT_MONITOR_OVERLAY_CORNER_SCORE_STATE = 'corner_score';
      const BIG_TV_RIGHT_MONITOR_OVERLAY_STATE_UNKNOWN = 'unknown';
      const BIG_TV_RIGHT_MONITOR_OVERLAY_BLUE_IMAGE_URL = 'assets/images/join_disc_blue.png';
      const BIG_TV_RIGHT_MONITOR_OVERLAY_CORNER_SCORE_IMAGE_URL = 'assets/images/join_disc_green.png';
      const BIG_TV_SCREENSAVER_GIF_URL = 'assets/video/dvd.gif';
      const CORNER_SCORE_API_URL = '/api/corner-score';
      const DVD_COLOR_STEPS = Object.freeze([
        { color: '#ff4d4d', hue: 0 },
        { color: '#40d6ff', hue: 170 },
        { color: '#7dff67', hue: 80 },
        { color: '#ffe066', hue: 40 },
        { color: '#ff78e2', hue: 300 }
      ]);
      const DVD_BOUNCE_SPEED_PX_PER_SECOND = 260;
      const DVD_FRAME_DELTA_MAX_SECONDS = 0.05;
      const AQUARIUM_STATIC_VIDEO_URL = 'assets/video/static.v20260424.mp4';
      const AQUARIUM_LOCAL_SHRIMP_CLIPS = Object.freeze(
        Array.from({ length: 23 }, (_, index) => `assets/video/shrimp/sh${index + 1}.mp4`)
      );
      const AQUARIUM_CLIP_CATALOG_API_URL = '/api/aquarium/shrimp-clips';
      const AQUARIUM_CLIP_SOURCE_GOOGLE_DRIVE = 'google-drive';
      const AQUARIUM_CLIP_SOURCE_LOCAL_FALLBACK = 'local-fallback';
      // On iOS, native fullscreen exit fires 'pause' before 'ended'. This tolerance
      // (in seconds) lets the 'ended' event arrive before treating the pause as an
      // interruption of the playback sequence.
      const MEDIA_ENDED_PAUSE_TOLERANCE_S = 0.5;
      const BIG_TV_DEBUG_WATERMARK_SERVER_ASSET = 'server_asset';
      const BIG_TV_DEBUG_WATERMARK_SHRIMP_CITY = 'google_drive';
      const BIG_TV_DEBUG_WATERMARK_DEFAULT_TOP_PX = 8;
      const BIG_TV_DEBUG_WATERMARK_MIN_TOP_MARGIN_PX = 2;
      const BIG_TV_DEBUG_WATERMARK_LETTERBOX_CLEARANCE_PX = 4;
      const RADIO_TUNING_AUDIO_URLS = [
        'assets/audio/frequency_search.mp3',
        'assets/audio/freesound_community-radio-tuning-switching-through-frequencies-german-radio-stations-14846.mp3',
        'assets/audio/freesound_community-static-poppy-light-107792.mp3',
        'assets/audio/freesound_community-high-pitch-large-102845.mp3'
      ];
      const RADIO_TUNING_STATION_POSITIONS = [0.06, 0.2, 0.36, 0.52, 0.68, 0.84, 0.95];
      const RADIO_TUNING_STATION_WIDTH = 0.06;
      const RADIO_TUNING_MOVEMENT_DECAY_ACTIVE = 0.45;
      const RADIO_TUNING_MOVEMENT_DECAY_IDLE = 0.8;
      const RADIO_TUNING_MOVEMENT_GAIN = 18;
      const RADIO_TUNING_MOVEMENT_FLOOR = 0.2;
      const RADIO_TUNING_WOBBLE_SPEED = 0.015;
      const RADIO_TUNING_WOBBLE_POSITION_FACTOR = 15;
      const RADIO_TUNING_WOBBLE_DEPTH = 0.08;
      const RADIO_TUNING_PLAYBACK_RATE_BASE = 0.84;
      const RADIO_TUNING_PLAYBACK_RATE_STATION_GAIN = 0.24;
      const RADIO_TUNING_PLAYBACK_RATE_MIN = 0.72;
      const RADIO_TUNING_PLAYBACK_RATE_MAX = 1.28;
      const RADIO_TUNING_VOLUME_BASE = 0.14;
      const RADIO_TUNING_VOLUME_STATION_GAIN = 0.74;
      const RADIO_TUNING_VOLUME_MOVEMENT_GAIN = 0.1;
      const RADIO_TUNING_VOLUME_MIN = 0.08;
      const NEDRY_GATE_VIDEO_URL = 'assets/video/nedrygate.mp4';
      const BIG_TV_RICKROLL_VIDEO_URL = 'assets/video/notarickroll-piece-1.v20260424.mp4';
      const ZELDA_SECRET_AUDIO_URL = 'assets/audio/zelda-secret.v20260424.mp3';
      const DISCORD_GUEST_INVITE_URL = 'https://discord.gg/kTkD7N3JN';
      const DISCORD_GUILD_ID = '';
      const DISCORD_WIDGET_URL = DISCORD_GUILD_ID
        ? `https://discord.com/widget?id=${DISCORD_GUILD_ID}&theme=dark`
        : null;
      const DISCORD_BUTTON_IMAGE_URL = BIG_TV_RIGHT_MONITOR_OVERLAY_BLUE_IMAGE_URL;
      const STARSHRIMP_LOGO_IMAGE_URL = 'assets/images/starshrimp_logo.png';
      const COMMODORE_DESK_IMAGE_URL = 'assets/images/commodore-desk-overlay.png';
      const LEFT_MONITOR_SIDE_FRAME_IMAGE_URL = 'assets/images/L_Frame.png';
      const RIGHT_MONITOR_SIDE_FRAME_IMAGE_URL = 'assets/images/R_Frame.png';
      const BIG_TV_PROMPT_PREFIX = 'Z:>';
      const BIG_TV_PROMPT_SECRET_TEXT = 'You didn\'t say the MAGIC WORD';
      const BIG_TV_PROMPT_ACCEPTED_VALUE = 'please';
      const BIG_TV_TOOLS_STORAGE_KEY = 'naimean.bigTvTools.entries';
      const DEN_URL_OVERRIDES_STORAGE_KEY = 'naimean.den.urlOverrides';
      const BIG_TV_TOOLS_LOGO_URL = 'assets/images/tools_logo.png';
      const LOGIN_LOGO_URL = 'assets/images/login_logo.png';
      const CALENDAR_MONTH_IMAGE_BASE_URL = 'assets/image/calendar';
      const CALENDAR_MONTH_IMAGE_START = Object.freeze({ year: 2026, month: 4 }); // May 2026, zero-based month
      const CALENDAR_MONTH_IMAGE_END = Object.freeze({ year: 2030, month: 4 }); // May 2030, zero-based month
      const CALENDAR_MONTH_NAME_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long' });
      const BIG_TV_INTERACTIVE_UI_SELECTORS = '.big-tv-prompt-content, .big-tv-prompt-secret-box, .big-tv-tools-overlay, .login-overlay, .calendar-big-tv-overlay, .big-tv-fullscreen-exit-button';
      // Keep values comfortably within localStorage and the on-screen form layout.
      const BIG_TV_TOOLS_MAX_NAME_LENGTH = 120;
      const BIG_TV_TOOLS_MAX_URL_LENGTH = 2000;
      const DISCORD_CDN_BASE_URL = 'https://cdn.discordapp.com';
      const DISCORD_USER_ID_RE = /^\d+$/;
      const DISCORD_AVATAR_HASH_RE = /^(a_)?[a-f0-9]{32}$/i;
      const DISCORD_LOGIN_FLOW_STORAGE_KEY = 'naimean.discordLoginFlow.v1';
      const DISCORD_LOGIN_SEQUENCE_STEP_DELAY_MS = 900;
      const DISCORD_LOGIN_SEQUENCE_REDIRECT_DELAY_MS = 1200;
      const DISCORD_LOGIN_STEP_KEYS = Object.freeze(['display', 'oauth', 'return']);
      const PERFORMANCE_PANEL_QUERY_KEY = 'perf';
      const PERFORMANCE_METRIC_ORDER = Object.freeze(['LCP', 'INP', 'TTFB', 'JS boot']);
      const PERFORMANCE_PANEL_STYLES = [
        'position:fixed',
        'top:12px',
        'right:12px',
        'z-index:99999',
        'min-width:190px',
        'max-width:240px',
        'padding:10px 12px',
        'border:1px solid rgba(255,255,255,0.18)',
        'border-radius:10px',
        'background:rgba(7,12,20,0.88)',
        'box-shadow:0 10px 24px rgba(0,0,0,0.35)',
        'backdrop-filter:blur(8px)',
        'color:#f4f7fb',
        'font:12px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        'pointer-events:none'
      ].join(';');
      const MONITOR_STATIC_MIN_DURATION_MS = 1000;
      const MONITOR_STATIC_MAX_DURATION_MS = 2000;
      const MONITOR_CONTENT_MIN_DURATION_MS = 3000;
      const MONITOR_CONTENT_MAX_DURATION_MS = 5000;
      const LEFT_MONITOR_SEGMENTS = Object.freeze([
        // Order matches CSS grid flow (row-first): NW, NE, SW, SE
        { state: 'tools',    label: 'Tools',    quadrant: 'NW' },
        { state: 'login',    label: 'Login',    quadrant: 'NE' },
        { state: 'calendar', label: 'Calendar', quadrant: 'SW' },
        { state: 'mail',     label: 'Mail',     quadrant: 'SE' }
      ]);
      const LEFT_MONITOR_STATES = new Set([...LEFT_MONITOR_SEGMENTS.map(({ state }) => state), 'none']); // 'none' is valid but has no rendered segment
      const DEFAULT_LEFT_MONITOR_STATE = 'none';
      const LEFT_MONITOR_IMAGE_URLS = Object.freeze({
        login: 'assets/images/L_Monitor_Login.png',
        tools: 'assets/images/L_Monitor_Tools.png',
        calendar: 'assets/images/L_Monitor_Calendar.png',
        mail: 'assets/images/L_Monitor_Mail.png',
        none: 'assets/images/L_Monitor_None.png'
      });
      const NOTES_URL = 'notes.html';
      const PENCIL_SHARPENER_HOTSPOT_ID = 'pencil-sharpener';
      const DISCORD_OVERLAY_ID = 'overlay-big-tv';
      const AQUARIUM_OVERLAY_ID = 'overlay-aquarium-video';
      const BIG_TV_FULLSCREEN_OVERLAY_IDS = new Set([DISCORD_OVERLAY_ID, AQUARIUM_OVERLAY_ID]);
      const FLIP_CLOCK_OVERLAY_ID = 'overlay-flip-clock';
      const CLOCK_URL_WINDOWS = 'ms-clock://';
      const CLOCK_URL_IOS = 'clock-alarm://';
      const CALENDAR_URL_DESKTOP = 'outlookcal://';
      const CALENDAR_URL_MOBILE = 'msteams://l/meetings';
      const WORLD_WIDTH_SEGMENTS = 3;
      const SCENE_TILE_IMAGE_URLS = [
        {
          avif: 'assets/images/den_arcade.v20260528.avif',
          webp: 'assets/images/den_arcade.v20260528.webp',
          png: 'assets/images/den_arcade.v20260528.PNG',
        },
        {
          avif: 'assets/images/den_computer.avif',
          webp: 'assets/images/den_computer.webp',
          png: 'assets/images/den_computer.png',
        },
        {
          avif: 'assets/images/den_chapel.v20260528.avif',
          webp: 'assets/images/den_chapel.v20260528.webp',
          png: 'assets/images/den_chapel.v20260528.png',
        },
      ];
      const DISCORD_OVERLAY_CONTROL_ID = 'overlay-big-tv-control';
      const BIG_TV_SHADOW_LAYER_ID = 'big_tv_shadow_layer';
      const BIG_TV_SHADOW_LAYER_CONTROL_ID = 'big_tv_shadow_layer_control';
      const LEFT_MONITOR_OVERLAY_CONTROL_ID = 'overlay-left-monitor-control';
      const LEFT_MONITOR_SHADOW_LAYER_ID = 'left_monitor_shadow_layer';
      const LEFT_MONITOR_SHADOW_LAYER_CONTROL_ID = 'left_monitor_shadow_layer_control';
      const COMMODORE_OVERLAY_CONTROL_ID = 'overlay-commodore-screen-control';
      const COMMODORE_SHADOW_OVERLAY_ID = 'overlay-commodore-shadow';
      const COMMODORE_SHADOW_CONTROL_ID = 'overlay-commodore-shadow-control';
      const COMMODORE_POWER_BUTTON_OVERLAY_ID = 'overlay-commodore-power-button';
      const COMMODORE_POWER_BUTTON_CONTROL_ID = 'overlay-commodore-power-button-control';
      const MIN_HOTSPOT_SIZE = 20; // Keep editable hotspots large enough to remain targetable in debug mode.
      const MIN_MONITOR_RATIO_DENOMINATOR = 0.0001; // Prevents divide-by-zero when converting between screen-window and frame bounds.
      const LEGACY_MONITOR_BOUNDS_TOLERANCE_PX = 12; // Legacy monitor control bounds may drift slightly from expected monitor frame/screen-window coordinates.
      const COMMODORE_HITBOX_HORIZONTAL_INSET = 40; // Shrinks Commodore click area while preserving overlay artwork width.
      const COMMODORE_HITBOX_VERTICAL_INSET = 70; // Shrinks Commodore click area while preserving overlay artwork height.
      const COMMODORE_MIN_SOURCE_HITBOX_WIDTH = MIN_HOTSPOT_SIZE + (COMMODORE_HITBOX_HORIZONTAL_INSET * 2);
      const COMMODORE_MIN_SOURCE_HITBOX_HEIGHT = MIN_HOTSPOT_SIZE + (COMMODORE_HITBOX_VERTICAL_INSET * 2);
      const RIGHT_MONITOR_OVERLAY_CONTROL_ID = 'overlay-right-monitor-control';
      const RIGHT_MONITOR_SHADOW_LAYER_ID = 'right_monitor_shadow_layer';
      const RIGHT_MONITOR_SHADOW_LAYER_CONTROL_ID = 'right_monitor_shadow_layer_control';
      const LEFT_MONITOR_SIDE_FRAME_OVERLAY_ID = 'overlay-left-monitor-side-frame';
      const LEFT_MONITOR_SIDE_FRAME_CONTROL_ID = 'overlay-left-monitor-side-frame-control';
      const RIGHT_MONITOR_SIDE_FRAME_OVERLAY_ID = 'overlay-right-monitor-side-frame';
      const RIGHT_MONITOR_SIDE_FRAME_CONTROL_ID = 'overlay-right-monitor-side-frame-control';
      const FLIP_CLOCK_OVERLAY_CONTROL_ID = 'overlay-flip-clock-control';
      const ASHTRAY_SMOKE_EFFECT_ID = 'ashtray-smoke-effect';
      const ASHTRAY_SMOKE_CONTROL_ID = 'ashtray-smoke-effect-control';
      const ASHTRAY_CIGARETTE_EFFECT_ID = 'ashtray-cigarette-effect';
      const ASHTRAY_CIGARETTE_CONTROL_ID = 'ashtray-cigarette-effect-control';
      const ASHTRAY_SMOKE_SOURCE_X = 1374;
      const ASHTRAY_SMOKE_Y = 1816;
      const SMOKE_CEILING_Y = 0;
      const SMOKE_FADE_TO_CEILING_RATIO = 0.6;
      const MIN_SMOKE_RISE_DISTANCE = 320;
      const SMOKE_SOURCE_VERTICAL_OFFSET = 64;
      const ASHTRAY_SMOKE_DEFAULT_WIDTH = 280;
      const ASHTRAY_SMOKE_TAIL_HEIGHT = 140;
      const ASHTRAY_CIGARETTE_DEFAULT_BOUNDS = Object.freeze({ x: 1292, y: 1802, w: 148, h: 44 });
      const COMMODORE_POWER_BUTTON_BOUNDS = Object.freeze({ x: 2143, y: 1637, w: 55, h: 39 });
      const LEFT_MONITOR_FRAME_BOUNDS = Object.freeze({ x: 1331, y: 1020, w: 280, h: 220 });
      const RIGHT_MONITOR_FRAME_BOUNDS = Object.freeze({ x: 1758, y: 1014, w: 288, h: 228 });
      const LEFT_MONITOR_SCREEN_WINDOW_INSETS = Object.freeze({ top: 0.1709, right: 0.24414, bottom: 0.29297, left: 0.252 });
      const RIGHT_MONITOR_SCREEN_WINDOW_INSETS = Object.freeze({ top: 0.29297, right: 0.2526, bottom: 0.1709, left: 0.24414 });
      const LEFT_MONITOR_SCREEN_BOUNDS = Object.freeze(frameBoundsToScreenBounds(LEFT_MONITOR_FRAME_BOUNDS, LEFT_MONITOR_SCREEN_WINDOW_INSETS));
      const RIGHT_MONITOR_SCREEN_BOUNDS = Object.freeze(frameBoundsToScreenBounds(RIGHT_MONITOR_FRAME_BOUNDS, RIGHT_MONITOR_SCREEN_WINDOW_INSETS));
      HOTSPOT_READABLE_LABELS.set(COMMODORE_OVERLAY_CONTROL_ID, 'Commodore Screen');
      HOTSPOT_READABLE_LABELS.set(COMMODORE_SHADOW_CONTROL_ID, 'Commodore Shadow');
      HOTSPOT_READABLE_LABELS.set(COMMODORE_POWER_BUTTON_CONTROL_ID, 'Commodore Power Button');
      HOTSPOT_READABLE_LABELS.set(DISCORD_OVERLAY_CONTROL_ID, 'Fullscreen Big TV');
      HOTSPOT_READABLE_LABELS.set(BIG_TV_SHADOW_LAYER_CONTROL_ID, 'Big TV Shadow Layer');
      HOTSPOT_READABLE_LABELS.set(LEFT_MONITOR_OVERLAY_CONTROL_ID, 'Left Monitor Overlay');
      HOTSPOT_READABLE_LABELS.set(LEFT_MONITOR_SHADOW_LAYER_CONTROL_ID, 'Left Monitor Shadow Layer');
      HOTSPOT_READABLE_LABELS.set(LEFT_MONITOR_SIDE_FRAME_CONTROL_ID, 'Left Monitor Side Frame');
      HOTSPOT_READABLE_LABELS.set(RIGHT_MONITOR_OVERLAY_CONTROL_ID, 'Right Monitor Overlay');
      HOTSPOT_READABLE_LABELS.set(RIGHT_MONITOR_SHADOW_LAYER_CONTROL_ID, 'Right Monitor Shadow Layer');
      HOTSPOT_READABLE_LABELS.set(RIGHT_MONITOR_SIDE_FRAME_CONTROL_ID, 'Right Monitor Side Frame');
      HOTSPOT_READABLE_LABELS.set(ASHTRAY_SMOKE_CONTROL_ID, 'Ashtray Smoke Effect');
      HOTSPOT_READABLE_LABELS.set(ASHTRAY_CIGARETTE_CONTROL_ID, 'Ashtray Cigarette Effect');
      const LOCKED_DEBUG_HOTSPOT_IDS = new Set([
        'overlay-monitor-screen-control', // Keep legacy monitor control id locked if present in persisted hotspot data.
        'overlaymonitorscreencontrol'
      ]);
      const OVERLAY_CONTROL_BINDINGS = [
        { controlId: DISCORD_OVERLAY_CONTROL_ID, overlayId: DISCORD_OVERLAY_ID },
        { controlId: BIG_TV_SHADOW_LAYER_CONTROL_ID, overlayId: BIG_TV_SHADOW_LAYER_ID },
        { controlId: LEFT_MONITOR_OVERLAY_CONTROL_ID, overlayId: 'overlay-left-monitor' },
        { controlId: LEFT_MONITOR_SHADOW_LAYER_CONTROL_ID, overlayId: LEFT_MONITOR_SHADOW_LAYER_ID },
        { controlId: LEFT_MONITOR_SIDE_FRAME_CONTROL_ID, overlayId: LEFT_MONITOR_SIDE_FRAME_OVERLAY_ID },
        { controlId: COMMODORE_OVERLAY_CONTROL_ID, overlayId: 'overlay-commodore-screen' },
        { controlId: COMMODORE_SHADOW_CONTROL_ID, overlayId: COMMODORE_SHADOW_OVERLAY_ID },
        { controlId: COMMODORE_POWER_BUTTON_CONTROL_ID, overlayId: COMMODORE_POWER_BUTTON_OVERLAY_ID },
        { controlId: RIGHT_MONITOR_OVERLAY_CONTROL_ID, overlayId: 'overlay-right-monitor' },
        { controlId: RIGHT_MONITOR_SHADOW_LAYER_CONTROL_ID, overlayId: RIGHT_MONITOR_SHADOW_LAYER_ID },
        { controlId: RIGHT_MONITOR_SIDE_FRAME_CONTROL_ID, overlayId: RIGHT_MONITOR_SIDE_FRAME_OVERLAY_ID },
        { controlId: FLIP_CLOCK_OVERLAY_CONTROL_ID, overlayId: FLIP_CLOCK_OVERLAY_ID },
        { controlId: ASHTRAY_SMOKE_CONTROL_ID, overlayId: ASHTRAY_SMOKE_EFFECT_ID },
        { controlId: ASHTRAY_CIGARETTE_CONTROL_ID, overlayId: ASHTRAY_CIGARETTE_EFFECT_ID }
      ];
      const OVERLAY_CONTROL_TO_OVERLAY_ID = new Map(
        OVERLAY_CONTROL_BINDINGS.map(({ controlId, overlayId }) => [controlId, overlayId])
      );
      const OVERLAY_ID_TO_CONTROL_ID = new Map(
        OVERLAY_CONTROL_BINDINGS.map(({ controlId, overlayId }) => [overlayId, controlId])
      );
      const MONITOR_SCREEN_INSETS_BY_CONTROL_ID = new Map([
        [LEFT_MONITOR_OVERLAY_CONTROL_ID, LEFT_MONITOR_SCREEN_WINDOW_INSETS],
        [RIGHT_MONITOR_OVERLAY_CONTROL_ID, RIGHT_MONITOR_SCREEN_WINDOW_INSETS]
      ]);
      const MONITOR_FRAME_BOUNDS_BY_OVERLAY_CONTROL_ID = new Map([
        [LEFT_MONITOR_OVERLAY_CONTROL_ID, LEFT_MONITOR_FRAME_BOUNDS],
        [RIGHT_MONITOR_OVERLAY_CONTROL_ID, RIGHT_MONITOR_FRAME_BOUNDS]
      ]);
      const MONITOR_SCREEN_INSETS_BY_SIDE_FRAME_CONTROL_ID = new Map([
        [LEFT_MONITOR_SIDE_FRAME_CONTROL_ID, LEFT_MONITOR_SCREEN_WINDOW_INSETS],
        [RIGHT_MONITOR_SIDE_FRAME_CONTROL_ID, RIGHT_MONITOR_SCREEN_WINDOW_INSETS]
      ]);
      const MONITOR_SCREEN_INSETS_BY_OVERLAY_ID = new Map([
        ['overlay-left-monitor', LEFT_MONITOR_SCREEN_WINDOW_INSETS],
        ['overlay-right-monitor', RIGHT_MONITOR_SCREEN_WINDOW_INSETS]
      ]);

      // Fixed pixel hotspots in design-space coordinates.
      // Edit x/y/w/h values as artwork alignment is refined.
      const defaultHotspots = [
        { id: NOAHS_ARCADE_HOTSPOT_ID, x: 880, y: 320, w: 2050, h: 1280 },
        { id: 'aquarium', x: 2680, y: 445, w: 455, h: 729 },
        { id: 'rca-board', x: 738, y: 380, w: 470, h: 1060 },
        { id: 'chapel', x: 3840, y: 0, w: 3840, h: 2160 },
        ...WHITEBOARD_TASK_HOTSPOTS.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })),
        { id: 'pencil-sharpener', x: 2562, y: 1220, w: 221, h: 245 },
        { id: DISCORD_OVERLAY_CONTROL_ID, x: 1469, y: 330, w: 1000, h: 572 },
        { id: BIG_TV_SHADOW_LAYER_CONTROL_ID, x: 1468, y: 329, w: 1002, h: 574 },
        { id: COMMODORE_OVERLAY_CONTROL_ID, x: 1703, y: 994, w: 372, h: 246 },
        { id: COMMODORE_SHADOW_CONTROL_ID, x: 1682, y: 1095, w: 414, h: 198 },
        { id: COMMODORE_POWER_BUTTON_CONTROL_ID, ...COMMODORE_POWER_BUTTON_BOUNDS },
        { id: RIGHT_MONITOR_OVERLAY_CONTROL_ID, ...RIGHT_MONITOR_SCREEN_BOUNDS },
        { id: RIGHT_MONITOR_SHADOW_LAYER_CONTROL_ID, ...RIGHT_MONITOR_FRAME_BOUNDS },
        { id: RIGHT_MONITOR_SIDE_FRAME_CONTROL_ID, ...RIGHT_MONITOR_FRAME_BOUNDS },
        { id: FLIP_CLOCK_OVERLAY_CONTROL_ID, x: 990, y: 1740, w: 360, h: 156 },
        {
          id: ASHTRAY_SMOKE_CONTROL_ID,
          x: ASHTRAY_SMOKE_SOURCE_X - Math.round(ASHTRAY_SMOKE_DEFAULT_WIDTH / 2),
          y: Math.round(ASHTRAY_SMOKE_Y - Math.max(
            MIN_SMOKE_RISE_DISTANCE,
            (ASHTRAY_SMOKE_Y - SMOKE_CEILING_Y) * SMOKE_FADE_TO_CEILING_RATIO
          ) + SMOKE_SOURCE_VERTICAL_OFFSET),
          w: ASHTRAY_SMOKE_DEFAULT_WIDTH,
          h: Math.round(Math.max(
            MIN_SMOKE_RISE_DISTANCE,
            (ASHTRAY_SMOKE_Y - SMOKE_CEILING_Y) * SMOKE_FADE_TO_CEILING_RATIO
          ) + ASHTRAY_SMOKE_TAIL_HEIGHT)
        },
        { id: ASHTRAY_CIGARETTE_CONTROL_ID, ...ASHTRAY_CIGARETTE_DEFAULT_BOUNDS },
        { id: LEFT_MONITOR_OVERLAY_CONTROL_ID, ...LEFT_MONITOR_SCREEN_BOUNDS },
        { id: LEFT_MONITOR_SHADOW_LAYER_CONTROL_ID, ...LEFT_MONITOR_FRAME_BOUNDS },
        { id: LEFT_MONITOR_SIDE_FRAME_CONTROL_ID, ...LEFT_MONITOR_FRAME_BOUNDS }
      ];

      // Overlay placeholders over transparent screen cutouts.
      const overlayDefaults = [
        { id: DISCORD_OVERLAY_ID, x: 1468, y: 329, w: 1002, h: 574 },
        { id: AQUARIUM_OVERLAY_ID, x: 1468, y: 329, w: 1002, h: 574 },
        { id: BIG_TV_SHADOW_LAYER_ID, x: 1468, y: 329, w: 1002, h: 574 },
        { id: 'overlay-left-monitor', ...LEFT_MONITOR_FRAME_BOUNDS },
        { id: LEFT_MONITOR_SHADOW_LAYER_ID, ...LEFT_MONITOR_FRAME_BOUNDS },
        { id: LEFT_MONITOR_SIDE_FRAME_OVERLAY_ID, ...LEFT_MONITOR_FRAME_BOUNDS },
        { id: COMMODORE_SHADOW_OVERLAY_ID, x: 1682, y: 1095, w: 414, h: 198 },
        { id: 'overlay-commodore-screen', x: 1703, y: 994, w: 372, h: 246 },
        { id: COMMODORE_POWER_BUTTON_OVERLAY_ID, ...COMMODORE_POWER_BUTTON_BOUNDS },
        { id: 'overlay-right-monitor', ...RIGHT_MONITOR_FRAME_BOUNDS },
        { id: RIGHT_MONITOR_SHADOW_LAYER_ID, ...RIGHT_MONITOR_FRAME_BOUNDS },
        { id: RIGHT_MONITOR_SIDE_FRAME_OVERLAY_ID, ...RIGHT_MONITOR_FRAME_BOUNDS },
        { id: FLIP_CLOCK_OVERLAY_ID, x: 990, y: 1740, w: 360, h: 156 }
      ].map((overlay) => {
        const adjustedOverlay = { ...overlay, x: overlay.x + SCENE_OFFSET_X };
        if (overlay.id === DISCORD_OVERLAY_ID || overlay.id === AQUARIUM_OVERLAY_ID) {
          adjustedOverlay.x += 1;
          adjustedOverlay.y += 1;
          adjustedOverlay.w = Math.max(0, adjustedOverlay.w - 2);
          adjustedOverlay.h = Math.max(0, adjustedOverlay.h - 2);
        }
        return adjustedOverlay;
      });

      const viewport = document.getElementById('viewport');
      const stage = document.getElementById('stage');
      const world = document.getElementById('world');
      const sceneLayer = document.getElementById('scene-layer');
      const hotspotLayer = document.getElementById('hotspot-layer');
      const screenOverlayLayer = document.getElementById('screen-overlay-layer');
      const effectsLayer = document.getElementById('effects-layer');
      const debugStatus = document.getElementById('debug-status');
      const debugToggleButton = document.getElementById('debug-toggle-btn');
      const debugObjectSelect = document.getElementById('debug-object-select');
      const debugObjectLockButton = document.getElementById('debug-object-lock-btn');
      const debugObjectUnlockButton = document.getElementById('debug-object-unlock-btn');
      const debugUrlRow = document.getElementById('debug-url-row');
      const debugUrlInput = document.getElementById('debug-url-input');
      const debugUrlSaveButton = document.getElementById('debug-url-save-btn');
      const saveBtn = document.getElementById('save-hotspots-btn');
      const saveModal = document.getElementById('save-modal');
      const saveModalTitle = document.getElementById('save-modal-title');
      const saveModalTextarea = document.getElementById('save-modal-textarea');
      const searchParams = new URLSearchParams(window.location.search);
      const isPerformancePanelEnabled = searchParams.get(PERFORMANCE_PANEL_QUERY_KEY) === '1';
      const isIOSDevice =
        /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
        (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
      const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const useLiteRendering = isIOSDevice || hasCoarsePointer;
      const DEBUG_SAVE_PASSWORD_KEY = 'naimean-debug';
      const DEBUG_SAVE_PASSWORD_CIPHER = [90, 87, 91, 84, 85];

      const worldWidth = WORLD_WIDTH_SEGMENTS * TILE_WIDTH;
      const worldHeight = DESIGN_HEIGHT;

      let scale = 1;
      let visibleWidth = worldWidth;
      let maxCameraX = 0;
      let cameraX = 0;
      let targetCameraX = 0;
      let isDragging = false;
      let isPointerDown = false;
      let activePointerId = null;
      let pointerStartX = 0;
      let lastPointerX = 0;
      let hasInitializedCamera = false;
      let dragStartedOnHotspot = false;
      let suppressHotspotClickUntil = 0;
      let cameraAnimationFrameId = null;
      let activePointerType = '';
      let lastPointerMoveTime = 0;
      let dragVelocityX = 0;
      let momentumAnimationFrameId = null;
      let momentumVelocityX = 0;
      let lastMomentumTimestamp = 0;
      let saveButtonResetTimeoutId = null;
      let hasDebugSaveAccess = false;
      let hotspotApiMode = 'primary';
      let flipClockIntervalId = null;
      let flipClockAlignTimeoutId = null;
      let performancePanelEl = null;
      let latestLcpEntry = null;
      let largestInteractionDuration = 0;
      let performanceObserversFinalized = false;
      let performanceMeasureToken = 0;
      const overlayElementsById = new Map();
      let aquariumOverlayEl = null;
      let aquariumStaticOverlayEl = null;
      let aquariumStaticVideoEl = null;
      let bigTvDvdOverlayEl = null;
      let bigTvDvdGifEl = null;
      let isBigTvDvdLoopInterrupted = false;
      let dvdAnimationFrameId = null;
      let dvdLastFrameTime = 0;
      let dvdPositionX = 0;
      let dvdPositionY = 0;
      let dvdVelocityX = 1;
      let dvdVelocityY = 1;
      let hasDvdPosition = false;
      let isDvdAnimationActive = false;
      let dvdColorStepIndex = 0;
      let cornerScoreValue = 0;
      let isDvdCornerCountEnabled = false;
      let rightMonitorCornerScoreOverlayEl = null;
      let rightMonitorCornerScoreValueEl = null;
      let rightMonitorScreenWindowEl = null;
      let cornerScorePersistQueue = Promise.resolve();
      let aquariumSequenceToken = 0;
      let aquariumLoopOwnerToken = 0;
      let isRightMonitorAquariumSequenceRunning = false;
      let bigTvPromptOverlayEl = null;
      let bigTvPromptSecretBoxEl = null;
      let bigTvPromptSecretEl = null;
      let bigTvPromptInputEl = null;
      let bigTvPromptHiddenInputEl = null;
      let bigTvPromptSubmitButtonEl = null;
      let bigTvPromptSecretRevealTimeoutId = null;
      let isBigTvPromptActive = false;
      let bigTvPromptInputValue = '';
      let bigTvPromptSequenceToken = 0;
      let bigTvToolsOverlayEl = null;
      let bigTvToolsListEl = null;
      let bigTvToolsHeaderActionButtonEl = null;
      let bigTvToolsFooterEl = null;
      let bigTvToolsHintEl = null;
      let isBigTvToolsActive = false;
      let bigTvToolsViewMode = 'menu';
      let bigTvToolsSequenceToken = 0;
      let bigTvToolsEntries = loadBigTvToolsEntries();
      let loginOverlayEl = null;
      let calendarBigTvOverlayEl = null;
      let calendarMonthImageEl = null;
      let isCalendarBigTvActive = false;
      let loginStatusBadgeEl = null;
      let loginTitleEl = null;
      let loginMessageEl = null;
      let loginPrimaryActionButtonEl = null;
      let loginAuthCardEl = null;
      let loginAuthAvatarEl = null;
      let loginAuthUsernameValueEl = null;
      let loginAuthUserIdValueEl = null;
      let loginAuthMembershipValueEl = null;
      let loginAuthAccessValueEl = null;
      let isLoginActive = false;
      let isDiscordLoginSequenceRunning = false;
      let loginSequenceToken = 0;
      let nedryGateOverlayEl = null;
      let nedryGateVideoEl = null;
      let bigTvDebugWatermarkEl = null;
      let zeldaSecretAudioEl = null;
      let flipClockRadioTuningAudioEl = null;
      const flipClockRadioTuningAudioElsByUrl = new Map();
      let flipClockRadioTuningAudioCycle = [];
      let rightMonitorStaticOverlayEl = null;
      let rightMonitorStaticVideoEl = null;
      let rightMonitorShrimpLogoOverlayEl = null;
      let leftMonitorStaticOverlayEl = null;
      let leftMonitorStaticVideoEl = null;
      let leftMonitorContentImageEl = null;
      let leftMonitorSelectedState = DEFAULT_LEFT_MONITOR_STATE;
      let discordJoinButtonEl = null;
      let discordButtonImgEl = null;
      let rightMonitorOverlayImageUrl = BIG_TV_RIGHT_MONITOR_OVERLAY_BLUE_IMAGE_URL;
      let discordAuthState = null;
      let aquariumShrimpClips = [...AQUARIUM_LOCAL_SHRIMP_CLIPS];
      let aquariumShrimpClipSet = new Set(aquariumShrimpClips);
      let aquariumShrimpClipQueue = [];
      let aquariumShrimpClipSource = AQUARIUM_CLIP_SOURCE_LOCAL_FALLBACK;
      let aquariumClipHistory = []; // URLs of clips that have been played, newest last
      let aquariumHistoryPointer = 0; // 0 = live (at newest), >0 = N steps back in history
      let commodorePowerButtonEl = null;
      let isCommodorePoweringOn = loadCommodorePowerState();
      let commodoreShadowOverlayEl = null;
      let bigTvShadowOverlayEl = null;
      let leftMonitorShadowOverlayEl = null;
      let rightMonitorShadowOverlayEl = null;
      let monitorPowerTimeoutIds = [];
      const leftMonitorSegmentButtonsByState = new Map();
      const loginStepElsByKey = new Map();
      let shouldAutoStartDiscordLoginOnNextLoginActivation = false;
      let rightMonitorFlickerTimeoutId = null;
      let leftMonitorFlickerTimeoutId = null;
      // Debug hotspot editing state
      let debugEditType = null; // 'move' | 'resize'
      let debugEditEl = null;
      let debugEditDir = null;
      let debugEditStartX = 0;
      let debugEditStartY = 0;
      let debugEditOrigRect = null; // { left, top, w, h } in design-space px
      let denUrlOverrides = loadDenUrlOverrides();

      let hotspots = sourceHotspotsToRuntime(defaultHotspots);

      function ensurePerformancePanel() {
        if (!isPerformancePanelEnabled || performancePanelEl || !document.body) {
          return;
        }
        performancePanelEl = document.createElement('aside');
        performancePanelEl.setAttribute('aria-hidden', 'true');
        performancePanelEl.style.cssText = PERFORMANCE_PANEL_STYLES;
        document.body.appendChild(performancePanelEl);
      }

      function renderPerformancePanel() {
        if (!isPerformancePanelEnabled) {
          return;
        }
        ensurePerformancePanel();
        if (!performancePanelEl) {
          return;
        }
        const metricsByName = window.__NAIMEAN_PERFORMANCE__?.metrics ?? {};
        performancePanelEl.innerHTML = `
          <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.72;margin-bottom:6px;">Performance</div>
          ${PERFORMANCE_METRIC_ORDER.map((name) => {
            const metric = metricsByName[name];
            const value = metric ? `${metric.value.toFixed(1)} ms` : '…';
            const state = metric?.provisional ? ' <span style="opacity:0.6;">(live)</span>' : '';
            return `<div style="display:flex;justify-content:space-between;gap:12px;"><strong>${name}</strong><span>${value}${state}</span></div>`;
          }).join('')}
        `;
      }

      function updatePerformanceMetric(name, value, { provisional = false } = {}) {
        if (!Number.isFinite(value)) {
          return;
        }
        const nextMetric = {
          name,
          value: Math.round(value * 10) / 10,
          provisional
        };
        const metrics = {
          ...(window.__NAIMEAN_PERFORMANCE__?.metrics ?? {}),
          [name]: nextMetric
        };
        window.__NAIMEAN_PERFORMANCE__ = {
          enabled: isPerformancePanelEnabled,
          metrics
        };
        if (isPerformancePanelEnabled) {
          console.info(`[perf] ${name}: ${nextMetric.value.toFixed(1)} ms`);
        }
        renderPerformancePanel();
      }

      function measureSyncSection(name, callback) {
        if (!perfApi?.mark || !perfApi?.measure) {
          return callback();
        }
        performanceMeasureToken += 1;
        const token = performanceMeasureToken;
        const startMark = `${name}-start-${token}`;
        const endMark = `${name}-end-${token}`;
        perfApi.mark(startMark);
        try {
          return callback();
        } finally {
          perfApi.mark(endMark);
          perfApi.measure(name, startMark, endMark);
        }
      }

      function scheduleNonCriticalTask(callback, { timeout = 1500 } = {}) {
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(callback, { timeout });
          return;
        }
        window.requestAnimationFrame(() => {
          window.setTimeout(callback, 0);
        });
      }

      function finalizePerformanceObservers() {
        if (performanceObserversFinalized) {
          return;
        }
        performanceObserversFinalized = true;
        if (latestLcpEntry) {
          updatePerformanceMetric('LCP', latestLcpEntry.startTime);
        }
        if (largestInteractionDuration > 0) {
          updatePerformanceMetric('INP', largestInteractionDuration);
        }
      }

      function observePerformanceMetrics() {
        const navigationEntry = perfApi?.getEntriesByType?.('navigation')?.[0];
        // activationStart is the Web Vitals baseline for prerender/BFCache restores;
        // regular navigations continue to use the navigation start time (0).
        const activationStart = Number.isFinite(navigationEntry?.activationStart)
          ? navigationEntry.activationStart
          : 0;
        const ttfbStart = activationStart > 0
          ? activationStart
          : (Number.isFinite(navigationEntry?.startTime) ? navigationEntry.startTime : 0);
        const ttfb = navigationEntry
          ? navigationEntry.responseStart - ttfbStart
          : NaN;
        updatePerformanceMetric('TTFB', ttfb);

        if (typeof window.PerformanceObserver !== 'function') {
          return;
        }

        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            latestLcpEntry = entries[entries.length - 1] || latestLcpEntry;
            if (latestLcpEntry) {
              updatePerformanceMetric('LCP', latestLcpEntry.startTime, { provisional: true });
            }
          });
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (_) {}

        try {
          const inpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry?.interactionId || !Number.isFinite(entry.duration)) {
                continue;
              }
              if (entry.duration > largestInteractionDuration) {
                largestInteractionDuration = entry.duration;
                updatePerformanceMetric('INP', largestInteractionDuration, { provisional: true });
              }
            }
          });
          inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
        } catch (_) {}

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            finalizePerformanceObservers();
          }
        });
        window.addEventListener('pagehide', finalizePerformanceObservers, { once: true });
      }

      function sourceHotspotXToRuntime(id, x) {
        return FIRST_TILE_HOTSPOT_IDS.has(id) ? x : x + SCENE_OFFSET_X;
      }

      function runtimeHotspotXToSource(id, x) {
        return FIRST_TILE_HOTSPOT_IDS.has(id) ? x : x - SCENE_OFFSET_X;
      }

      function hasActiveBigTvContentOverlay() {
        const aquariumActive = aquariumStaticOverlayEl?.classList.contains('is-active');
        const nedryGateActive = nedryGateOverlayEl?.classList.contains('is-active');
        const promptActive = isBigTvPromptActive;
        const toolsActive = isBigTvToolsActive;
        const loginActive = isLoginActive;
        const calendarActive = isCalendarBigTvActive;
        return aquariumActive || nedryGateActive || promptActive || toolsActive || loginActive || calendarActive;
      }

      function getCurrentRightMonitorOverlayState() {
        const currentImageUrl =
          discordButtonImgEl?.getAttribute('src') ||
          rightMonitorOverlayImageUrl;
        if (currentImageUrl.includes(BIG_TV_RIGHT_MONITOR_OVERLAY_BLUE_IMAGE_URL)) {
          return DEFAULT_BIG_TV_RIGHT_MONITOR_OVERLAY_STATE;
        }
        if (currentImageUrl.includes(BIG_TV_RIGHT_MONITOR_OVERLAY_CORNER_SCORE_IMAGE_URL)) {
          return BIG_TV_RIGHT_MONITOR_OVERLAY_CORNER_SCORE_STATE;
        }
        return BIG_TV_RIGHT_MONITOR_OVERLAY_STATE_UNKNOWN;
      }

      function setRightMonitorOverlayImageUrl(nextImageUrl) {
        rightMonitorOverlayImageUrl = nextImageUrl || BIG_TV_RIGHT_MONITOR_OVERLAY_BLUE_IMAGE_URL;
        if (discordButtonImgEl) {
          discordButtonImgEl.src = rightMonitorOverlayImageUrl;
        }
      }

      function playRightMonitorScoringNoise() {
        const scoringNoiseAudio = getZeldaSecretAudioElement();
        stopZeldaSecretAudioPlayback();
        const playPromise = scoringNoiseAudio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((error) => {
            if (error?.name !== 'AbortError') {
              console.warn('Unable to play right monitor scoring noise.', error);
            }
          });
        }
      }

      function activateRightMonitorCornerScoreMode() {
        setRightMonitorOverlayImageUrl(BIG_TV_RIGHT_MONITOR_OVERLAY_CORNER_SCORE_IMAGE_URL);
        playRightMonitorScoringNoise();
      }

      function hasDefaultMonitorOverlays() {
        return (
          leftMonitorSelectedState === DEFAULT_LEFT_MONITOR_STATE &&
          getCurrentRightMonitorOverlayState() === DEFAULT_BIG_TV_RIGHT_MONITOR_OVERLAY_STATE
        );
      }

      function isBigTvDefaultScreensaverActive() {
        return (
          !isBigTvDvdLoopInterrupted &&
          !!bigTvDvdOverlayEl &&
          bigTvDvdOverlayEl.classList.contains('is-active') &&
          !hasActiveBigTvContentOverlay() &&
          hasDefaultMonitorOverlays()
        );
      }

      function getCurrentDvdColorStep() {
        return DVD_COLOR_STEPS[dvdColorStepIndex % DVD_COLOR_STEPS.length];
      }

      function applyDvdColorStep() {
        const { color, hue } = getCurrentDvdColorStep();
        if (bigTvDvdOverlayEl) {
          bigTvDvdOverlayEl.style.setProperty('--dvd-accent-color', color);
          bigTvDvdOverlayEl.style.setProperty('--dvd-hue-deg', `${hue}deg`);
        }
        if (rightMonitorCornerScoreOverlayEl) {
          rightMonitorCornerScoreOverlayEl.style.setProperty('--corner-score-color', color);
        }
      }

      function renderCornerScore() {
        if (rightMonitorCornerScoreValueEl) {
          rightMonitorCornerScoreValueEl.textContent = String(cornerScoreValue);
        }
      }

      function setCornerScore(nextScore) {
        if (!Number.isFinite(nextScore)) {
          return;
        }
        cornerScoreValue = Math.max(0, Math.floor(nextScore));
        renderCornerScore();
      }

      async function loadCornerScoreFromServer() {
        try {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
          const response = await fetch(CORNER_SCORE_API_URL, {
            method: 'GET',
            signal: controller.signal
          });
          window.clearTimeout(timeoutId);
          if (!response.ok) {
            return;
          }
          const payload = await response.json();
          setCornerScore(payload?.score);
        } catch (_) {}
      }

      function queueCornerScoreIncrement() {
        cornerScorePersistQueue = cornerScorePersistQueue
          .then(async () => {
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
            const response = await fetch(CORNER_SCORE_API_URL, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ incrementBy: 1 }),
              signal: controller.signal
            });
            window.clearTimeout(timeoutId);
            if (!response.ok) {
              return;
            }
            const payload = await response.json();
            setCornerScore(payload?.score);
          })
          .catch(() => {});
      }

      function stopBigTvDvdAnimation() {
        isDvdAnimationActive = false;
        dvdLastFrameTime = 0;
        if (dvdAnimationFrameId !== null) {
          window.cancelAnimationFrame(dvdAnimationFrameId);
          dvdAnimationFrameId = null;
        }
      }

      function getDvdLogoDimensions() {
        if (!bigTvDvdOverlayEl || !bigTvDvdGifEl) {
          return null;
        }
        const boundsWidth = bigTvDvdOverlayEl.clientWidth;
        const boundsHeight = bigTvDvdOverlayEl.clientHeight;
        const logoWidth = bigTvDvdGifEl.offsetWidth;
        const logoHeight = bigTvDvdGifEl.offsetHeight;
        if (!boundsWidth || !boundsHeight || !logoWidth || !logoHeight) {
          return null;
        }
        return { boundsWidth, boundsHeight, logoWidth, logoHeight };
      }

      function tickBigTvDvdAnimation(timestamp) {
        if (!isDvdAnimationActive || !bigTvDvdGifEl) {
          stopBigTvDvdAnimation();
          return;
        }

        const dimensions = getDvdLogoDimensions();
        if (!dimensions) {
          dvdAnimationFrameId = window.requestAnimationFrame(tickBigTvDvdAnimation);
          return;
        }

        const { boundsWidth, boundsHeight, logoWidth, logoHeight } = dimensions;
        const maxX = Math.max(0, boundsWidth - logoWidth);
        const maxY = Math.max(0, boundsHeight - logoHeight);

        if (!hasDvdPosition) {
          dvdPositionX = maxX / 2;
          dvdPositionY = maxY / 2;
          hasDvdPosition = true;
        } else {
          dvdPositionX = clamp(dvdPositionX, 0, maxX);
          dvdPositionY = clamp(dvdPositionY, 0, maxY);
        }

        if (!dvdLastFrameTime) {
          dvdLastFrameTime = timestamp;
          bigTvDvdGifEl.style.transform = `translate3d(${dvdPositionX}px, ${dvdPositionY}px, 0)`;
          dvdAnimationFrameId = window.requestAnimationFrame(tickBigTvDvdAnimation);
          return;
        }

        const deltaSeconds = Math.min(
          DVD_FRAME_DELTA_MAX_SECONDS,
          Math.max(0, (timestamp - dvdLastFrameTime) / 1000)
        );
        dvdLastFrameTime = timestamp;
        dvdPositionX += dvdVelocityX * DVD_BOUNCE_SPEED_PX_PER_SECOND * deltaSeconds;
        dvdPositionY += dvdVelocityY * DVD_BOUNCE_SPEED_PX_PER_SECOND * deltaSeconds;

        let hitHorizontalEdge = false;
        let hitVerticalEdge = false;
        if (dvdPositionX <= 0) {
          dvdPositionX = 0;
          dvdVelocityX = 1;
          hitHorizontalEdge = true;
        } else if (dvdPositionX >= maxX) {
          dvdPositionX = maxX;
          dvdVelocityX = -1;
          hitHorizontalEdge = true;
        }

        if (dvdPositionY <= 0) {
          dvdPositionY = 0;
          dvdVelocityY = 1;
          hitVerticalEdge = true;
        } else if (dvdPositionY >= maxY) {
          dvdPositionY = maxY;
          dvdVelocityY = -1;
          hitVerticalEdge = true;
        }

        if (hitHorizontalEdge || hitVerticalEdge) {
          dvdColorStepIndex = (dvdColorStepIndex + 1) % DVD_COLOR_STEPS.length;
          applyDvdColorStep();
        }

        const isCornerHit = hitHorizontalEdge && hitVerticalEdge;
        if (isCornerHit && isDvdCornerCountEnabled && isRightMonitorInteractive()) {
          setCornerScore(cornerScoreValue + 1);
          const zeldaAudio = getZeldaSecretAudioElement();
          stopZeldaSecretAudioPlayback();
          const playPromise = zeldaAudio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((error) => {
              if (error?.name !== 'AbortError') {
                console.warn('Unable to play Zelda secret audio.', error);
              }
            });
          }
          queueCornerScoreIncrement();
        }

        bigTvDvdGifEl.style.transform = `translate3d(${dvdPositionX}px, ${dvdPositionY}px, 0)`;
        dvdAnimationFrameId = window.requestAnimationFrame(tickBigTvDvdAnimation);
      }

      function startBigTvDvdAnimation() {
        if (isDvdAnimationActive || !bigTvDvdGifEl) {
          return;
        }
        isDvdAnimationActive = true;
        dvdLastFrameTime = 0;
        dvdAnimationFrameId = window.requestAnimationFrame(tickBigTvDvdAnimation);
      }

      function syncDvdScreensaverState() {
        const isScreensaverActive = isBigTvDefaultScreensaverActive();
        const isCornerScoreActive = isScreensaverActive && isDvdCornerCountEnabled && isRightMonitorInteractive();
        if (rightMonitorCornerScoreOverlayEl) {
          rightMonitorCornerScoreOverlayEl.classList.toggle('is-active', isCornerScoreActive);
          rightMonitorCornerScoreOverlayEl.setAttribute('aria-hidden', isCornerScoreActive ? 'false' : 'true');
        }
        if (rightMonitorScreenWindowEl) {
          rightMonitorScreenWindowEl.classList.toggle('is-corner-score-active', isCornerScoreActive);
        }
        if (bigTvDvdOverlayEl) {
          bigTvDvdOverlayEl.setAttribute(
            'aria-label',
            isDvdCornerCountEnabled ? 'Disable CornerCount on right monitor' : 'Enable CornerCount on right monitor'
          );
        }
        if (isScreensaverActive) {
          startBigTvDvdAnimation();
          return;
        }
        stopBigTvDvdAnimation();
      }

      function syncBigTvContentVisibility() {
        const shouldShowBigTvOverlay = hasActiveBigTvContentOverlay();
        if (shouldShowBigTvOverlay) {
          interruptBigTvDvdLoop();
        }
        const discordOverlayEl = overlayElementsById.get(DISCORD_OVERLAY_ID);
        const fullscreenElement = document.fullscreenElement;
        if (discordOverlayEl) {
          const shouldHideDiscordOverlay = shouldShowBigTvOverlay && fullscreenElement !== discordOverlayEl;
          discordOverlayEl.style.visibility = shouldHideDiscordOverlay ? 'hidden' : 'visible';
        }
        if (aquariumOverlayEl) {
          aquariumOverlayEl.classList.toggle('is-active', shouldShowBigTvOverlay);
        }
        if (
          shouldShowBigTvOverlay &&
          fullscreenElement === discordOverlayEl &&
          aquariumOverlayEl
        ) {
          void enterBigTvFullscreen(aquariumOverlayEl);
        } else if (
          !shouldShowBigTvOverlay &&
          fullscreenElement === aquariumOverlayEl &&
          discordOverlayEl
        ) {
          void enterBigTvFullscreen(discordOverlayEl);
        }
        syncDvdScreensaverState();
      }

      function isBigTvFullscreenTarget(element) {
        return !!element && BIG_TV_FULLSCREEN_OVERLAY_IDS.has(element.id);
      }

      function getActiveBigTvFullscreenTarget() {
        if (aquariumOverlayEl?.classList.contains('is-active')) {
          return aquariumOverlayEl;
        }
        return overlayElementsById.get(DISCORD_OVERLAY_ID) || aquariumOverlayEl || null;
      }

      function syncBigTvFullscreenUi() {
        const fullscreenElement = document.fullscreenElement;
        [overlayElementsById.get(DISCORD_OVERLAY_ID), aquariumOverlayEl].forEach((overlayEl) => {
          if (!overlayEl) {
            return;
          }
          const isFullscreenTarget = fullscreenElement === overlayEl;
          overlayEl.classList.toggle('is-fullscreen', isFullscreenTarget);
          const exitButton = overlayEl.querySelector('.big-tv-fullscreen-exit-button');
          if (exitButton) {
            exitButton.hidden = !isFullscreenTarget;
            if (isFullscreenTarget) {
              exitButton.removeAttribute('aria-hidden');
            } else {
              exitButton.setAttribute('aria-hidden', 'true');
            }
          }
        });
        updateBigTvDebugWatermarkPlacement();
      }

      function getBigTvVideoFullscreenTarget(targetOverlayEl) {
        if (!targetOverlayEl) {
          return null;
        }
        const activeVideo = targetOverlayEl.querySelector(
          '.nedry-gate-overlay.is-active .nedry-gate-video, .discord-static-overlay.is-active .discord-static-video'
        );
        if (activeVideo instanceof HTMLVideoElement) {
          return activeVideo;
        }
        const fallbackVideo = targetOverlayEl.querySelector('.nedry-gate-video, .discord-static-video');
        return fallbackVideo instanceof HTMLVideoElement ? fallbackVideo : null;
      }

      function enterBigTvVideoFullscreenFallback(targetOverlayEl) {
        const targetVideo = getBigTvVideoFullscreenTarget(targetOverlayEl);
        if (!targetVideo || typeof targetVideo.webkitEnterFullscreen !== 'function') {
          return false;
        }
        try {
          targetVideo.webkitEnterFullscreen();
          return true;
        } catch (error) {
          console.warn('Unable to enter iOS video fullscreen mode.', error);
          return false;
        }
      }

      async function enterBigTvFullscreen(targetOverlayEl = getActiveBigTvFullscreenTarget()) {
        if (!targetOverlayEl || document.fullscreenElement === targetOverlayEl) {
          return;
        }
        if (isIOSDevice && enterBigTvVideoFullscreenFallback(targetOverlayEl)) {
          return;
        }
        if (typeof targetOverlayEl.requestFullscreen !== 'function') {
          if (!enterBigTvVideoFullscreenFallback(targetOverlayEl)) {
            console.warn('Unable to enter big TV fullscreen mode: API unavailable.');
          }
          return;
        }
        try {
          await targetOverlayEl.requestFullscreen();
        } catch (error) {
          console.warn('Unable to enter big TV fullscreen mode.', error);
          if (!enterBigTvVideoFullscreenFallback(targetOverlayEl)) {
            console.warn('Unable to enter big TV fullscreen fallback mode.');
          }
        }
      }

      async function exitBigTvFullscreen(event) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        if (!document.fullscreenElement || typeof document.exitFullscreen !== 'function') {
          return;
        }
        try {
          await document.exitFullscreen();
        } catch (error) {
          console.warn('Unable to exit big TV fullscreen mode.', error);
        }
      }

      function createBigTvFullscreenExitButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'big-tv-fullscreen-exit-button';
        button.hidden = true;
        button.setAttribute('aria-label', 'Exit fullscreen');
        button.setAttribute('aria-hidden', 'true');
        button.innerHTML = `
          <svg class="big-tv-fullscreen-exit-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 3H5v4"></path>
            <path d="M15 3h4v4"></path>
            <path d="M9 21H5v-4"></path>
            <path d="M15 21h4v-4"></path>
            <path d="M9 9 5 5"></path>
            <path d="m15 9 4-4"></path>
            <path d="m9 15-4 4"></path>
            <path d="m15 15 4 4"></path>
          </svg>
        `;
        button.addEventListener('pointerdown', (event) => event.stopPropagation());
        button.addEventListener('click', exitBigTvFullscreen);
        return button;
      }

      function syncLeftMonitorSelectionUi() {
        leftMonitorSegmentButtonsByState.forEach((button, state) => {
          button.classList.toggle('is-selected', state === leftMonitorSelectedState);
          button.setAttribute('aria-pressed', state === leftMonitorSelectedState ? 'true' : 'false');
        });
      }

      function syncDiscordButtonUi() {
        if (!discordJoinButtonEl) return;
        if (discordAuthState && discordAuthState.authenticated) {
          if (discordAuthState.isMember) {
            discordJoinButtonEl.setAttribute('aria-label', `Discord: ${discordAuthState.username}`);
            discordJoinButtonEl.title = `Signed in as ${discordAuthState.username}`;
          } else {
            discordJoinButtonEl.setAttribute('aria-label', 'Join our Discord');
            discordJoinButtonEl.title = 'Join our Discord';
          }
        } else if (discordAuthState && !discordAuthState.authenticated) {
          discordJoinButtonEl.setAttribute('aria-label', 'Sign in with Discord');
          discordJoinButtonEl.title = 'Sign in with Discord';
        }
        if (discordButtonImgEl) {
          discordButtonImgEl.src = rightMonitorOverlayImageUrl;
        }
        syncLoginOverlayUi();
        syncDvdScreensaverState();
      }

      function syncDiscordAuthBodyClass() {
        if (discordAuthState && discordAuthState.hasRole) {
          document.body.classList.add('has-discord-role');
        } else {
          document.body.classList.remove('has-discord-role');
        }
      }

      async function fetchDiscordAuthState() {
        try {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
          const res = await fetch('/api/discord/me', { signal: controller.signal });
          window.clearTimeout(timeoutId);
          if (res.ok) {
            discordAuthState = await res.json();
          }
        } catch {
          // Auth state remains null if request fails
        }
        syncLoginOverlayUi();
      }

      function persistDiscordLoginFlowState(value) {
        try {
          sessionStorage.setItem(DISCORD_LOGIN_FLOW_STORAGE_KEY, JSON.stringify({
            showLogin: !!value?.showLogin,
            restorePowerOn: !!value?.restorePowerOn
          }));
        } catch (_) {}
      }

      function consumeDiscordLoginFlowState() {
        try {
          const rawValue = sessionStorage.getItem(DISCORD_LOGIN_FLOW_STORAGE_KEY);
          if (!rawValue) {
            return null;
          }
          sessionStorage.removeItem(DISCORD_LOGIN_FLOW_STORAGE_KEY);
          const parsedValue = JSON.parse(rawValue);
          if (!parsedValue || typeof parsedValue !== 'object') {
            return null;
          }
          return {
            showLogin: !!parsedValue.showLogin,
            restorePowerOn: !!parsedValue.restorePowerOn
          };
        } catch (_) {
          return null;
        }
      }

      function getDiscordAvatarUrl(authState) {
        if (
          !authState?.authenticated ||
          !DISCORD_USER_ID_RE.test(authState.userId || '') ||
          !DISCORD_AVATAR_HASH_RE.test(authState.avatar || '')
        ) {
          return '';
        }
        // Discord animated avatar hashes use the `a_` prefix and must be requested as GIFs.
        const extension = authState.avatar.startsWith('a_') ? 'gif' : 'png';
        const avatarUrl = new URL(
          `${DISCORD_CDN_BASE_URL}/avatars/${authState.userId}/${authState.avatar}.${extension}?size=256`
        );
        if (avatarUrl.protocol !== 'https:' || avatarUrl.hostname !== 'cdn.discordapp.com') {
          return '';
        }
        return avatarUrl.toString();
      }

      function syncLoginStepUi({ activeKey = null, completedKeys = [] } = {}) {
        const completedKeySet = new Set(completedKeys);
        loginStepElsByKey.forEach((stepEl, key) => {
          stepEl.classList.toggle('is-complete', completedKeySet.has(key));
          stepEl.classList.toggle('is-active', key === activeKey && !completedKeySet.has(key));
          stepEl.classList.toggle('is-pending', !completedKeySet.has(key) && key !== activeKey);
        });
      }

      function syncLoginOverlayUi({ stage = 'idle' } = {}) {
        if (
          !loginStatusBadgeEl ||
          !loginTitleEl ||
          !loginMessageEl ||
          !loginPrimaryActionButtonEl ||
          !loginAuthCardEl
        ) {
          return;
        }

        if (discordAuthState?.authenticated) {
          loginStatusBadgeEl.textContent = 'Connected';
          loginTitleEl.textContent = 'Discord account ready';
          loginMessageEl.textContent = discordAuthState.isMember
            ? 'OAuth is complete. Your Discord account details are now displayed on the big TV.'
            : 'OAuth is complete. Your Discord account is connected, but it is not yet in the server.';
          loginPrimaryActionButtonEl.disabled = false;
          loginPrimaryActionButtonEl.textContent = 'Refresh Discord Status';
          loginAuthCardEl.classList.remove('is-hidden');
          const avatarUrl = getDiscordAvatarUrl(discordAuthState);
          loginAuthAvatarEl.src = avatarUrl || DISCORD_BUTTON_IMAGE_URL;
          loginAuthAvatarEl.alt = avatarUrl && discordAuthState.username
            ? `${discordAuthState.username} Discord avatar`
            : 'Discord logo';
          loginAuthUsernameValueEl.textContent = discordAuthState.username || 'Unknown';
          loginAuthUserIdValueEl.textContent = discordAuthState.userId || 'Unavailable';
          loginAuthMembershipValueEl.textContent = discordAuthState.isMember ? 'Server member' : 'Not in server';
          loginAuthAccessValueEl.textContent = discordAuthState.hasRole ? 'Role access granted' : 'Required role missing';
          syncLoginStepUi({ completedKeys: DISCORD_LOGIN_STEP_KEYS });
          return;
        }

        loginAuthCardEl.classList.add('is-hidden');
        loginAuthAvatarEl.removeAttribute('src');
        loginAuthAvatarEl.alt = 'Discord avatar';
        loginStatusBadgeEl.textContent = 'Discord OAuth';
        loginPrimaryActionButtonEl.disabled = isDiscordLoginSequenceRunning;

        if (stage === 'starting') {
          loginTitleEl.textContent = 'Waking the login screen';
          loginMessageEl.textContent = 'Showing the login screen on the big TV before opening Discord.';
          loginPrimaryActionButtonEl.textContent = 'Preparing Login…';
          syncLoginStepUi({ activeKey: 'display' });
          return;
        }

        if (stage === 'oauth') {
          loginTitleEl.textContent = 'Opening Discord OAuth';
          loginMessageEl.textContent = 'Step two is underway. Discord sign-in is opening now.';
          loginPrimaryActionButtonEl.textContent = 'Opening Discord…';
          syncLoginStepUi({ activeKey: 'oauth', completedKeys: ['display'] });
          return;
        }

        if (stage === 'redirecting') {
          loginTitleEl.textContent = 'Redirecting to Discord';
          loginMessageEl.textContent = 'Final step before the handoff. You are being redirected to Discord now.';
          loginPrimaryActionButtonEl.textContent = 'Redirecting…';
          syncLoginStepUi({ activeKey: 'return', completedKeys: ['display', 'oauth'] });
          return;
        }

        loginTitleEl.textContent = 'Step-by-step Discord sign-in';
        loginMessageEl.textContent = 'Use the Login quadrant to bring up this screen, then continue into Discord OAuth.';
        loginPrimaryActionButtonEl.textContent = 'Start Discord Login';
        syncLoginStepUi({ activeKey: 'display' });
      }

      async function beginDiscordLoginFlow(flowSequenceToken = loginSequenceToken) {
        if (isDiscordLoginSequenceRunning || discordAuthState?.authenticated) {
          syncLoginOverlayUi();
          return;
        }

        isDiscordLoginSequenceRunning = true;
        syncLoginOverlayUi({ stage: 'starting' });

        try {
          await wait(DISCORD_LOGIN_SEQUENCE_STEP_DELAY_MS);
          if (flowSequenceToken !== loginSequenceToken || leftMonitorSelectedState !== 'login') {
            return;
          }

          syncLoginOverlayUi({ stage: 'oauth' });
          await wait(DISCORD_LOGIN_SEQUENCE_STEP_DELAY_MS);
          if (flowSequenceToken !== loginSequenceToken || leftMonitorSelectedState !== 'login') {
            return;
          }

          persistDiscordLoginFlowState({
            showLogin: true,
            restorePowerOn: isCommodorePoweringOn
          });
          syncLoginOverlayUi({ stage: 'redirecting' });
          await wait(DISCORD_LOGIN_SEQUENCE_REDIRECT_DELAY_MS);
          if (flowSequenceToken !== loginSequenceToken || leftMonitorSelectedState !== 'login') {
            return;
          }

          window.location.assign('/api/discord/auth');
        } finally {
          if (flowSequenceToken === loginSequenceToken) {
            isDiscordLoginSequenceRunning = false;
          }
          syncLoginOverlayUi();
        }
      }

      async function handleLoginPrimaryAction() {
        if (discordAuthState?.authenticated) {
          await fetchDiscordAuthState();
          syncDiscordAuthBodyClass();
          syncDiscordButtonUi();
          return;
        }

        void beginDiscordLoginFlow();
      }

      function setLeftMonitorState(nextState) {
        if (!LEFT_MONITOR_STATES.has(nextState)) {
          return;
        }
        if (nextState !== 'login') {
          shouldAutoStartDiscordLoginOnNextLoginActivation = false;
        }
        leftMonitorSelectedState = nextState;
        if (leftMonitorContentImageEl) {
          const imageUrl = LEFT_MONITOR_IMAGE_URLS[nextState] || LEFT_MONITOR_IMAGE_URLS[DEFAULT_LEFT_MONITOR_STATE];
          leftMonitorContentImageEl.src = imageUrl;
          leftMonitorContentImageEl.classList.toggle('is-calendar-state', nextState === 'calendar');
        }
        syncLeftMonitorSelectionUi();
        if (nextState === 'tools' && isLeftMonitorInteractive() && isBigTvMonitorInteractive()) {
          hideCalendarBigTvOverlay();
          hideLoginOverlay();
          void activateBigTvToolsMode();
        } else if (nextState === 'login' && isLeftMonitorInteractive() && isBigTvMonitorInteractive()) {
          hideCalendarBigTvOverlay();
          hideBigTvToolsOverlay();
          void activateLoginMode();
        } else if (nextState === 'calendar' && isLeftMonitorInteractive() && isBigTvMonitorInteractive()) {
          hideBigTvToolsOverlay();
          hideLoginOverlay();
          void activateCalendarMode();
        } else {
          hideCalendarBigTvOverlay();
          hideBigTvToolsOverlay();
          hideLoginOverlay();
        }
        syncDvdScreensaverState();
      }

      function loadBigTvToolsEntries() {
        try {
          const storedValue = window.localStorage.getItem(BIG_TV_TOOLS_STORAGE_KEY);
          if (!storedValue) {
            return [];
          }
          const parsedValue = JSON.parse(storedValue);
          if (!Array.isArray(parsedValue)) {
            return [];
          }
          return parsedValue
            .map(normalizeBigTvToolEntry)
            .filter((entry) => entry.name || entry.url);
        } catch (error) {
          console.warn('Unable to load big TV tools entries.', error);
          return [];
        }
      }

      function normalizeBigTvToolEntry(entry) {
        return {
          name: typeof entry?.name === 'string' ? entry.name.slice(0, BIG_TV_TOOLS_MAX_NAME_LENGTH) : '',
          url: typeof entry?.url === 'string' ? entry.url.slice(0, BIG_TV_TOOLS_MAX_URL_LENGTH) : ''
        };
      }

      function saveBigTvToolsEntries() {
        if (!ensureDebugSaveAccess()) {
          return;
        }
        try {
          const sanitizedEntries = bigTvToolsEntries.map(normalizeBigTvToolEntry);
          bigTvToolsEntries = sanitizedEntries;
          window.localStorage.setItem(BIG_TV_TOOLS_STORAGE_KEY, JSON.stringify(sanitizedEntries));
        } catch (error) {
          console.warn('Unable to save big TV tools entries.', error);
        }
      }

      function updateBigTvToolEntry(index, field, value) {
        if (!bigTvToolsEntries[index] || (field !== 'name' && field !== 'url')) {
          return;
        }
        bigTvToolsEntries[index][field] = value;
        saveBigTvToolsEntries();
      }

      function renderBigTvToolsMenuEntries() {
        if (!bigTvToolsListEl) {
          return;
        }
        const hasVisibleEntries = bigTvToolsEntries.some(
          (e) => e.name.trim().length > 0 || e.url.trim().length > 0
        );
        if (bigTvToolsHintEl) {
          bigTvToolsHintEl.hidden = hasVisibleEntries;
        }
        bigTvToolsListEl.replaceChildren();
        bigTvToolsEntries.forEach((entry, index) => {
          const trimmedName = entry.name.trim();
          const trimmedUrl = entry.url.trim();
          const hasAnyValue = trimmedName.length > 0 || trimmedUrl.length > 0;
          if (!hasAnyValue) {
            return;
          }
          const itemRow = document.createElement('div');
          itemRow.className = 'big-tv-tools-menu-item';
          itemRow.addEventListener('pointerdown', (event) => event.stopPropagation());

          const launchButton = document.createElement('button');
          launchButton.type = 'button';
          launchButton.className = 'big-tv-tools-menu-item-launch';
          launchButton.setAttribute('aria-label', `${trimmedName || 'Unnamed Tool'} — opens in new tab`);
          launchButton.addEventListener('click', (event) => {
            event.stopPropagation();
            if (trimmedUrl) {
              window.open(trimmedUrl, '_blank', 'noopener,noreferrer');
            }
          });
          const itemName = document.createElement('span');
          itemName.className = 'big-tv-tools-menu-item-name';
          itemName.textContent = trimmedName || 'Unnamed Tool';
          const itemUrl = document.createElement('span');
          itemUrl.className = 'big-tv-tools-menu-item-url';
          itemUrl.textContent = trimmedUrl || 'No URL yet';
          launchButton.append(itemName, itemUrl);

          const editButton = document.createElement('button');
          editButton.type = 'button';
          editButton.className = 'big-tv-tools-menu-item-edit';
          editButton.setAttribute('aria-label', `Edit ${trimmedName || 'tool'}`);
          editButton.textContent = '✎';
          editButton.addEventListener('pointerdown', (event) => event.stopPropagation());
          editButton.addEventListener('click', (event) => {
            event.stopPropagation();
            showBigTvToolsEditor({ focusRowIndex: index, focusField: 'url' });
          });

          itemRow.append(launchButton, editButton);
          bigTvToolsListEl.appendChild(itemRow);
        });
      }

      function renderBigTvToolsEntries({ focusRowIndex = null, focusField = 'name' } = {}) {
        if (!bigTvToolsListEl) {
          return;
        }
        if (bigTvToolsViewMode !== 'editor') {
          renderBigTvToolsMenuEntries();
          return;
        }
        bigTvToolsListEl.replaceChildren();
        if (bigTvToolsHintEl) {
          bigTvToolsHintEl.hidden = true;
        }
        bigTvToolsEntries.forEach((entry, index) => {
          const row = document.createElement('div');
          row.className = 'big-tv-tools-row';

          const nameField = document.createElement('label');
          nameField.className = 'big-tv-tools-field';
          const nameLabel = document.createElement('span');
          nameLabel.className = 'big-tv-tools-label';
          nameLabel.textContent = 'Tool Name';
          const nameInput = document.createElement('input');
          nameInput.className = 'big-tv-tools-input';
          nameInput.type = 'text';
          nameInput.placeholder = 'Add tool name';
          nameInput.value = entry.name;
          nameInput.setAttribute('autocomplete', 'off');
          nameInput.addEventListener('pointerdown', (event) => event.stopPropagation());
          nameInput.addEventListener('click', (event) => event.stopPropagation());
          nameInput.addEventListener('input', (event) => updateBigTvToolEntry(index, 'name', event.target.value));
          nameField.append(nameLabel, nameInput);

          const urlField = document.createElement('label');
          urlField.className = 'big-tv-tools-field';
          const urlLabel = document.createElement('span');
          urlLabel.className = 'big-tv-tools-label';
          urlLabel.textContent = 'Embed URL';
          const urlInput = document.createElement('input');
          urlInput.className = 'big-tv-tools-input';
          urlInput.type = 'url';
          urlInput.placeholder = 'Paste embed URL';
          urlInput.value = entry.url;
          urlInput.setAttribute('autocomplete', 'off');
          urlInput.addEventListener('pointerdown', (event) => event.stopPropagation());
          urlInput.addEventListener('click', (event) => event.stopPropagation());
          urlInput.addEventListener('input', (event) => updateBigTvToolEntry(index, 'url', event.target.value));
          urlInput.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') {
              return;
            }
            event.preventDefault();
            showBigTvToolsMenu();
          });
          urlField.append(urlLabel, urlInput);

          row.append(nameField, urlField);
          bigTvToolsListEl.appendChild(row);

          if (focusRowIndex === index) {
            const focusTarget = focusField === 'url' ? urlInput : nameInput;
            window.requestAnimationFrame(() => focusTarget.focus());
          }
        });
      }

      function syncBigTvToolsUiMode({ focusRowIndex = null, focusField = 'name' } = {}) {
        if (bigTvToolsHeaderActionButtonEl) {
          if (bigTvToolsViewMode === 'editor') {
            bigTvToolsHeaderActionButtonEl.textContent = '←';
            bigTvToolsHeaderActionButtonEl.setAttribute('aria-label', 'Back to tools menu');
          } else {
            bigTvToolsHeaderActionButtonEl.textContent = '+';
            bigTvToolsHeaderActionButtonEl.setAttribute('aria-label', 'Add tool');
          }
        }
        if (bigTvToolsFooterEl) {
          bigTvToolsFooterEl.classList.toggle('is-hidden', bigTvToolsViewMode !== 'editor');
        }
        renderBigTvToolsEntries({ focusRowIndex, focusField });
      }

      function showBigTvToolsMenu() {
        bigTvToolsViewMode = 'menu';
        syncBigTvToolsUiMode();
      }

      function showBigTvToolsEditor({ focusRowIndex = null, focusField = 'name' } = {}) {
        bigTvToolsViewMode = 'editor';
        syncBigTvToolsUiMode({ focusRowIndex, focusField });
      }

      function addBigTvToolEntry() {
        bigTvToolsEntries.push({ name: '', url: '' });
        saveBigTvToolsEntries();
        showBigTvToolsEditor({ focusRowIndex: bigTvToolsEntries.length - 1 });
      }

      function showBigTvToolsOverlay() {
        if (!bigTvToolsOverlayEl) {
          return;
        }
        isBigTvToolsActive = true;
        showBigTvToolsMenu();
        bigTvToolsOverlayEl.classList.add('is-active');
        bigTvToolsOverlayEl.setAttribute('aria-hidden', 'false');
        syncBigTvContentVisibility();
      }

      function hideBigTvToolsOverlay({ cancelSequence = true } = {}) {
        if (cancelSequence) {
          bigTvToolsSequenceToken += 1;
        }
        isBigTvToolsActive = false;
        if (bigTvToolsOverlayEl) {
          bigTvToolsOverlayEl.classList.remove('is-active');
          bigTvToolsOverlayEl.setAttribute('aria-hidden', 'true');
        }
        bigTvToolsViewMode = 'menu';
        saveBigTvToolsEntries();
        syncBigTvContentVisibility();
      }

      async function activateBigTvToolsMode() {
        bigTvToolsSequenceToken += 1;
        const sequenceToken = bigTvToolsSequenceToken;
        stopAquariumPlaybackSequence();
        hideBigTvPromptOverlay();
        hideNedryGateOverlay();
        hideBigTvToolsOverlay({ cancelSequence: false });

        await playBigTvStaticPass(sequenceToken, () => bigTvToolsSequenceToken);
        if (sequenceToken !== bigTvToolsSequenceToken) {
          hideAquariumStaticOverlay();
          return;
        }

        hideAquariumStaticOverlay();
        showBigTvToolsOverlay();
      }

      function showLoginOverlay() {
        if (!loginOverlayEl) {
          return;
        }
        isLoginActive = true;
        loginOverlayEl.classList.add('is-active');
        loginOverlayEl.setAttribute('aria-hidden', 'false');
        syncLoginOverlayUi();
        syncBigTvContentVisibility();
      }

      function hideLoginOverlay({ cancelSequence = true } = {}) {
        if (cancelSequence) {
          loginSequenceToken += 1;
        }
        isLoginActive = false;
        isDiscordLoginSequenceRunning = false;
        if (loginOverlayEl) {
          loginOverlayEl.classList.remove('is-active');
          loginOverlayEl.setAttribute('aria-hidden', 'true');
        }
        syncBigTvContentVisibility();
      }

      function compareCalendarMonths(aYear, aMonth, bYear, bMonth) {
        if (aYear !== bYear) {
          return aYear - bYear;
        }
        return aMonth - bMonth;
      }

      function resolveCalendarImageMonth(date = new Date()) {
        let year = date.getFullYear();
        let month = date.getMonth();

        if (compareCalendarMonths(year, month, CALENDAR_MONTH_IMAGE_START.year, CALENDAR_MONTH_IMAGE_START.month) < 0) {
          year = CALENDAR_MONTH_IMAGE_START.year;
          month = CALENDAR_MONTH_IMAGE_START.month;
        } else if (compareCalendarMonths(year, month, CALENDAR_MONTH_IMAGE_END.year, CALENDAR_MONTH_IMAGE_END.month) > 0) {
          year = CALENDAR_MONTH_IMAGE_END.year;
          month = CALENDAR_MONTH_IMAGE_END.month;
        }

        return { year, month };
      }

      function getCalendarMonthImageUrl(date = new Date()) {
        const { year, month } = resolveCalendarImageMonth(date);
        const monthLabel = CALENDAR_MONTH_NAME_FORMATTER.format(new Date(year, month, 1));
        const fileName = `${monthLabel} ${year}.png`;
        return `${CALENDAR_MONTH_IMAGE_BASE_URL}/${encodeURIComponent(fileName)}`;
      }

      function showCalendarBigTvOverlay() {
        if (!calendarBigTvOverlayEl) {
          return;
        }
        isCalendarBigTvActive = true;
        if (calendarMonthImageEl) {
          calendarMonthImageEl.src = getCalendarMonthImageUrl(new Date());
        }
        calendarBigTvOverlayEl.classList.add('is-active');
        calendarBigTvOverlayEl.setAttribute('aria-hidden', 'false');
        syncBigTvContentVisibility();
      }

      function hideCalendarBigTvOverlay() {
        isCalendarBigTvActive = false;
        if (calendarBigTvOverlayEl) {
          calendarBigTvOverlayEl.classList.remove('is-active');
          calendarBigTvOverlayEl.setAttribute('aria-hidden', 'true');
        }
        syncBigTvContentVisibility();
      }

      let calendarBigTvSequenceToken = 0;

      async function activateCalendarMode() {
        calendarBigTvSequenceToken += 1;
        const sequenceToken = calendarBigTvSequenceToken;
        stopAquariumPlaybackSequence();
        hideBigTvPromptOverlay();
        hideNedryGateOverlay();
        hideBigTvToolsOverlay();
        hideLoginOverlay({ cancelSequence: false });
        hideCalendarBigTvOverlay();

        await playBigTvStaticPass(sequenceToken, () => calendarBigTvSequenceToken);
        if (sequenceToken !== calendarBigTvSequenceToken) {
          hideAquariumStaticOverlay();
          return;
        }

        hideAquariumStaticOverlay();
        showCalendarBigTvOverlay();
      }

      async function activateLoginMode() {
        loginSequenceToken += 1;
        const sequenceToken = loginSequenceToken;
        stopAquariumPlaybackSequence();
        hideBigTvPromptOverlay();
        hideNedryGateOverlay();
        hideBigTvToolsOverlay();
        hideLoginOverlay({ cancelSequence: false });

        await playBigTvStaticPass(sequenceToken, () => loginSequenceToken);
        if (sequenceToken !== loginSequenceToken) {
          hideAquariumStaticOverlay();
          return;
        }

        hideAquariumStaticOverlay();
        showLoginOverlay();
        if (shouldAutoStartDiscordLoginOnNextLoginActivation && !discordAuthState?.authenticated) {
          shouldAutoStartDiscordLoginOnNextLoginActivation = false;
          void beginDiscordLoginFlow(sequenceToken);
        } else {
          shouldAutoStartDiscordLoginOnNextLoginActivation = false;
          syncLoginOverlayUi();
        }
      }

      function cancelAquariumPlaybackSequence() {
        aquariumSequenceToken += 1;
      }

      function isAquariumPlaybackSequenceActive() {
        return aquariumLoopOwnerToken !== 0 && aquariumLoopOwnerToken === aquariumSequenceToken;
      }

      function stopAquariumPlaybackSequence() {
        cancelAquariumPlaybackSequence();
        hideNedryGateOverlay();
        hideAquariumStaticOverlay();
        aquariumLoopOwnerToken = 0;
      }

      function replayAquariumPlaybackSequenceFromStatic() {
        if (!isAquariumPlaybackSequenceActive()) {
          return false;
        }
        cancelAquariumPlaybackSequence();
        hideNedryGateOverlay();
        hideAquariumStaticOverlay();
        hideBigTvPromptOverlay({ clearInput: false });
        const sequenceToken = aquariumSequenceToken;
        aquariumLoopOwnerToken = sequenceToken;
        void runAquariumPlaybackSequence(sequenceToken, { startWithStatic: true });
        return true;
      }

      function interruptAquariumPlaybackSequence() {
        if (isAquariumPlaybackSequenceActive()) {
          stopAquariumPlaybackSequence();
        }
      }

      function recordAquariumClipInHistory(clipUrl) {
        if (aquariumHistoryPointer > 0) {
          aquariumClipHistory = aquariumClipHistory.slice(0, aquariumClipHistory.length - aquariumHistoryPointer);
          aquariumHistoryPointer = 0;
        }
        aquariumClipHistory.push(clipUrl);
        if (aquariumClipHistory.length > 50) {
          aquariumClipHistory.shift();
        }
      }

      function skipToAquariumClip(clipUrl, { recordInHistory = true } = {}) {
        if (!isAquariumPlaybackSequenceActive()) {
          return false;
        }
        cancelAquariumPlaybackSequence();
        hideNedryGateOverlay();
        hideAquariumStaticOverlay();
        hideBigTvPromptOverlay({ clearInput: false });
        const sequenceToken = aquariumSequenceToken;
        aquariumLoopOwnerToken = sequenceToken;
        void runAquariumPlaybackSequence(sequenceToken, { startClipUrl: clipUrl, recordStartClip: recordInHistory });
        return true;
      }

      function skipAquariumToNextClip() {
        if (aquariumHistoryPointer > 0) {
          aquariumHistoryPointer -= 1;
          const targetUrl = aquariumClipHistory[aquariumClipHistory.length - 1 - aquariumHistoryPointer];
          if (targetUrl) {
            return skipToAquariumClip(targetUrl, { recordInHistory: false });
          }
          aquariumHistoryPointer = 0;
        }
        return skipToAquariumClip(null, { recordInHistory: true });
      }

      function skipAquariumToPreviousClip() {
        const targetPointer = aquariumHistoryPointer + 1;
        const targetUrl = aquariumClipHistory[aquariumClipHistory.length - 1 - targetPointer];
        if (!targetUrl) {
          return false;
        }
        aquariumHistoryPointer = targetPointer;
        return skipToAquariumClip(targetUrl, { recordInHistory: false });
      }

      function shuffleArrayInPlace(values) {
        for (let index = values.length - 1; index > 0; index -= 1) {
          const randomIndex = Math.floor(Math.random() * (index + 1));
          [values[index], values[randomIndex]] = [values[randomIndex], values[index]];
        }
      }

      function getRandomShrimpClipUrl() {
        if (aquariumShrimpClipQueue.length === 0) {
          aquariumShrimpClipQueue = [...aquariumShrimpClips];
          shuffleArrayInPlace(aquariumShrimpClipQueue);
        }
        return aquariumShrimpClipQueue.pop();
      }

      function getBigTvDebugWatermarkText() {
        return aquariumShrimpClipSource === AQUARIUM_CLIP_SOURCE_GOOGLE_DRIVE
          ? BIG_TV_DEBUG_WATERMARK_SHRIMP_CITY
          : BIG_TV_DEBUG_WATERMARK_SERVER_ASSET;
      }

      function syncBigTvDebugWatermark() {
        if (!bigTvDebugWatermarkEl) {
          return;
        }
        bigTvDebugWatermarkEl.textContent = getBigTvDebugWatermarkText();
        updateBigTvDebugWatermarkPlacement();
      }

      function updateBigTvDebugWatermarkPlacement() {
        if (!bigTvDebugWatermarkEl || !nedryGateOverlayEl || !nedryGateVideoEl) {
          return;
        }

        const overlayRect = nedryGateOverlayEl.getBoundingClientRect();
        const overlayWidth = overlayRect.width;
        const overlayHeight = overlayRect.height;
        const videoWidth = nedryGateVideoEl.videoWidth;
        const videoHeight = nedryGateVideoEl.videoHeight;

        if (
          overlayWidth <= 0 ||
          overlayHeight <= 0 ||
          !Number.isFinite(videoWidth) ||
          !Number.isFinite(videoHeight) ||
          videoWidth <= 0 ||
          videoHeight <= 0
        ) {
          bigTvDebugWatermarkEl.style.top = `${BIG_TV_DEBUG_WATERMARK_DEFAULT_TOP_PX}px`;
          return;
        }

        const fitScale = Math.min(overlayWidth / videoWidth, overlayHeight / videoHeight);
        const renderedVideoHeight = videoHeight * fitScale;
        const topLetterboxHeight = Math.max(0, (overlayHeight - renderedVideoHeight) / 2);
        const watermarkHeight = bigTvDebugWatermarkEl.offsetHeight || 12;
        const preferredTop = topLetterboxHeight - watermarkHeight - BIG_TV_DEBUG_WATERMARK_MIN_TOP_MARGIN_PX;
        const safeTop = topLetterboxHeight > watermarkHeight + BIG_TV_DEBUG_WATERMARK_LETTERBOX_CLEARANCE_PX
          ? Math.max(BIG_TV_DEBUG_WATERMARK_MIN_TOP_MARGIN_PX, Math.round(preferredTop))
          : BIG_TV_DEBUG_WATERMARK_DEFAULT_TOP_PX;
        bigTvDebugWatermarkEl.style.top = `${safeTop}px`;
      }

      async function loadAquariumShrimpClipCatalog() {
        try {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
          const response = await fetch(AQUARIUM_CLIP_CATALOG_API_URL, { method: 'GET', signal: controller.signal });
          window.clearTimeout(timeoutId);
          if (!response.ok) {
            return;
          }
          const payload = await response.json();
          const source = typeof payload?.source === 'string' ? payload.source : '';
          const clips = Array.isArray(payload?.clips)
            ? payload.clips.filter((clipUrl) => typeof clipUrl === 'string' && clipUrl.trim().length > 0)
            : [];
          aquariumShrimpClipSource = source === AQUARIUM_CLIP_SOURCE_GOOGLE_DRIVE
            ? AQUARIUM_CLIP_SOURCE_GOOGLE_DRIVE
            : AQUARIUM_CLIP_SOURCE_LOCAL_FALLBACK;
          syncBigTvDebugWatermark();
          if (clips.length > 0) {
            aquariumShrimpClips = clips;
            aquariumShrimpClipSet = new Set(clips);
            aquariumShrimpClipQueue = [];
          }
        } catch {
          // Keep local fallback clips.
        }
      }

      function waitForMediaPlaybackToEnd(mediaEl) {
        return new Promise((resolve) => {
          const onEnded = () => {
            cleanup();
            resolve(true);
          };
          const onError = () => {
            cleanup();
            resolve(false);
          };
          const onPause = () => {
            if (mediaEl.ended) {
              return;
            }
            // On iOS, native fullscreen exit fires 'pause' before 'ended' when a clip
            // finishes. If the playhead is at (or within the tolerance of) the end of
            // the duration, don't break the sequence — let the 'ended' event resolve it.
            const dur = mediaEl.duration;
            if (Number.isFinite(dur) && dur > 0 && mediaEl.currentTime >= dur - MEDIA_ENDED_PAUSE_TOLERANCE_S) {
              return;
            }
            cleanup();
            resolve(false);
          };
          const cleanup = () => {
            mediaEl.removeEventListener('ended', onEnded);
            mediaEl.removeEventListener('error', onError);
            mediaEl.removeEventListener('pause', onPause);
          };
          mediaEl.addEventListener('ended', onEnded);
          mediaEl.addEventListener('error', onError);
          mediaEl.addEventListener('pause', onPause);
        });
      }

      function waitForBigTvMonitorInteractive(timeoutMs = BIG_TV_MONITOR_INTERACTIVE_WAIT_TIMEOUT_MS) {
        if (isBigTvMonitorInteractive()) {
          return Promise.resolve(true);
        }

        return new Promise((resolve) => {
          const deadline = Date.now() + timeoutMs;
          const checkInteractiveState = () => {
            if (isBigTvMonitorInteractive()) {
              resolve(true);
              return;
            }
            if (Date.now() >= deadline) {
              resolve(false);
              return;
            }
            window.setTimeout(checkInteractiveState, MONITOR_INTERACTIVE_POLL_INTERVAL_MS);
          };
          checkInteractiveState();
        });
      }

      function hideAquariumStaticOverlay({ resetPlayback = true } = {}) {
        if (aquariumStaticOverlayEl) {
          aquariumStaticOverlayEl.classList.remove('is-active');
        }
        if (aquariumStaticVideoEl) {
          aquariumStaticVideoEl.pause();
          if (resetPlayback) {
            aquariumStaticVideoEl.currentTime = 0;
          }
        }
        syncBigTvContentVisibility();
      }

      function interruptBigTvDvdLoop() {
        if (isBigTvDvdLoopInterrupted) {
          return;
        }
        isBigTvDvdLoopInterrupted = true;
        stopBigTvDvdAnimation();
        if (bigTvDvdOverlayEl) {
          bigTvDvdOverlayEl.classList.remove('is-active');
          bigTvDvdOverlayEl.setAttribute('aria-hidden', 'true');
        }
        syncDvdScreensaverState();
      }

      async function playAquariumStaticPass(sequenceToken) {
        if (!aquariumStaticOverlayEl || !aquariumStaticVideoEl) {
          return false;
        }
        aquariumStaticOverlayEl.classList.add('is-active');
        aquariumStaticVideoEl.currentTime = 0;
        syncBigTvContentVisibility();
        try {
          await aquariumStaticVideoEl.play();
        } catch (error) {
          if (error?.name !== 'AbortError') {
            console.warn('Unable to play aquarium static overlay.', error);
          }
          return false;
        }
        const hasEnded = await waitForMediaPlaybackToEnd(aquariumStaticVideoEl);
        return hasEnded && sequenceToken === aquariumSequenceToken;
      }

      async function playAquariumClipPass(sequenceToken, clipUrl) {
        if (!nedryGateOverlayEl || !nedryGateVideoEl) {
          return false;
        }
        const shrimpClipUrl = aquariumShrimpClipSet.has(clipUrl)
          ? clipUrl
          : getRandomShrimpClipUrl();
        setNedryGateVideoSource(shrimpClipUrl);
        nedryGateOverlayEl.classList.add('is-active');
        nedryGateVideoEl.currentTime = 0;
        syncBigTvContentVisibility();
        try {
          await nedryGateVideoEl.play();
        } catch (error) {
          if (error?.name !== 'AbortError') {
            console.warn('Unable to play aquarium clip.', error);
          }
          hideNedryGateOverlay();
          setNedryGateVideoSource(shrimpClipUrl);
          return false;
        }
        const hasEnded = await waitForMediaPlaybackToEnd(nedryGateVideoEl);
        hideNedryGateOverlay();
        setNedryGateVideoSource(shrimpClipUrl);
        return hasEnded && sequenceToken === aquariumSequenceToken;
      }

      async function runAquariumPlaybackSequence(sequenceToken, { startWithStatic = false, startClipUrl = null, recordStartClip = true } = {}) {
        if (startWithStatic) {
          const staticEnded = await playAquariumStaticPass(sequenceToken);
          if (!staticEnded || sequenceToken !== aquariumSequenceToken) {
            hideAquariumStaticOverlay();
            if (aquariumLoopOwnerToken === sequenceToken) {
              aquariumLoopOwnerToken = 0;
            }
            return;
          }
        }

        let firstClip = true;
        while (sequenceToken === aquariumSequenceToken) {
          let clipUrl;
          if (firstClip && startClipUrl !== null) {
            clipUrl = startClipUrl;
            if (recordStartClip) {
              recordAquariumClipInHistory(clipUrl);
            }
          } else {
            clipUrl = getRandomShrimpClipUrl();
            recordAquariumClipInHistory(clipUrl);
          }
          firstClip = false;

          const clipEnded = await playAquariumClipPass(sequenceToken, clipUrl);
          if (!clipEnded || sequenceToken !== aquariumSequenceToken) {
            break;
          }

          const staticEnded = await playAquariumStaticPass(sequenceToken);
          if (!staticEnded || sequenceToken !== aquariumSequenceToken) {
            hideAquariumStaticOverlay();
            break;
          }
        }

        if (aquariumLoopOwnerToken === sequenceToken) {
          aquariumLoopOwnerToken = 0;
        }
      }

      async function playRightMonitorAquariumSequence() {
        if (!rightMonitorStaticOverlayEl || !rightMonitorStaticVideoEl || !rightMonitorShrimpLogoOverlayEl) {
          return;
        }
        if (isRightMonitorAquariumSequenceRunning) {
          return;
        }
        isRightMonitorAquariumSequenceRunning = true;

        try {
          // Phase 1: play static.mp4 once (non-looping)
          rightMonitorStaticVideoEl.loop = false;
          rightMonitorStaticVideoEl.currentTime = 0;
          rightMonitorStaticOverlayEl.classList.add('is-active');
          try {
            await rightMonitorStaticVideoEl.play();
          } catch (error) {
            if (error?.name !== 'AbortError') {
              console.warn('Unable to play right monitor static (aquarium).', error);
            }
            rightMonitorStaticOverlayEl.classList.remove('is-active');
            rightMonitorStaticVideoEl.loop = true;
            syncDiscordButtonUi();
            return;
          }
          const firstStaticEnded = await waitForMediaPlaybackToEnd(rightMonitorStaticVideoEl);
          rightMonitorStaticOverlayEl.classList.remove('is-active');
          if (!firstStaticEnded || aquariumLoopOwnerToken === 0) {
            rightMonitorStaticVideoEl.loop = true;
            syncDiscordButtonUi();
            return;
          }

          // Phase 2: show shrimp logo while aquarium sequence runs (including replay-to-next transitions)
          rightMonitorShrimpLogoOverlayEl.classList.add('is-active');
          while (aquariumLoopOwnerToken !== 0) {
            await wait(100);
          }
          rightMonitorShrimpLogoOverlayEl.classList.remove('is-active');

          // Phase 3: on interruption, play static.mp4 once, then restore original button state
          rightMonitorStaticVideoEl.currentTime = 0;
          rightMonitorStaticOverlayEl.classList.add('is-active');
          try {
            await rightMonitorStaticVideoEl.play();
          } catch (error) {
            if (error?.name !== 'AbortError') {
              console.warn('Unable to play right monitor static (aquarium end).', error);
            }
            rightMonitorStaticOverlayEl.classList.remove('is-active');
            rightMonitorStaticVideoEl.loop = true;
            syncDiscordButtonUi();
            return;
          }
          await waitForMediaPlaybackToEnd(rightMonitorStaticVideoEl);
          rightMonitorStaticOverlayEl.classList.remove('is-active');
          rightMonitorStaticVideoEl.loop = true;
          syncDiscordButtonUi();
        } finally {
          rightMonitorShrimpLogoOverlayEl.classList.remove('is-active');
          isRightMonitorAquariumSequenceRunning = false;
        }
      }

      async function playAquariumHotspotSequence() {
        if (!isBigTvMonitorInteractive()) {
          if (!isCommodorePoweringOn) {
            triggerCommodorePowerOnSequence();
          }
          const isBigTvReady = await waitForBigTvMonitorInteractive();
          if (!isBigTvReady) {
            return;
          }
        }

        if (replayAquariumPlaybackSequenceFromStatic()) {
          return;
        }

        aquariumSequenceToken += 1;
        const sequenceToken = aquariumSequenceToken;
        aquariumLoopOwnerToken = sequenceToken;
        hideBigTvToolsOverlay();
        hideNedryGateOverlay();
        hideAquariumStaticOverlay();
        hideBigTvPromptOverlay({ clearInput: false });
        setLeftMonitorState(DEFAULT_LEFT_MONITOR_STATE);
        syncBigTvContentVisibility();
        if (!isRightMonitorAquariumSequenceRunning) {
          void playRightMonitorAquariumSequence();
        }
        await runAquariumPlaybackSequence(sequenceToken);
      }

      function hideNedryGateOverlay({ resetPlayback = true } = {}) {
        hideBigTvPromptOverlay({ clearInput: false });
        if (nedryGateOverlayEl) {
          nedryGateOverlayEl.classList.remove('is-active');
        }
        if (nedryGateVideoEl) {
          nedryGateVideoEl.pause();
          if (resetPlayback) {
            nedryGateVideoEl.currentTime = 0;
          }
        }
        syncBigTvContentVisibility();
      }

      function activateBigTvPromptMode() {
        if (!nedryGateOverlayEl || !nedryGateVideoEl) {
          return;
        }

        hideBigTvToolsOverlay();
        stopAquariumPlaybackSequence();
        stopZeldaSecretAudioPlayback();
        playBigTvPromptIntroSequence();
      }

      function hideAllMonitorShadows() {
        [commodoreShadowOverlayEl, bigTvShadowOverlayEl, leftMonitorShadowOverlayEl, rightMonitorShadowOverlayEl].forEach((el) => {
          if (!el) {
            return;
          }
          el.classList.remove('tv-turning-on', 'tv-turning-off');
          el.classList.add('is-monitor-on');
        });
      }

      function getRandomMonitorStaticDurationMs() {
        return MONITOR_STATIC_MIN_DURATION_MS + Math.floor(
          Math.random() * (MONITOR_STATIC_MAX_DURATION_MS - MONITOR_STATIC_MIN_DURATION_MS + 1)
        );
      }

      function getRandomMonitorContentDurationMs() {
        return MONITOR_CONTENT_MIN_DURATION_MS + Math.floor(
          Math.random() * (MONITOR_CONTENT_MAX_DURATION_MS - MONITOR_CONTENT_MIN_DURATION_MS + 1)
        );
      }

      function clearMonitorFlickerTimeouts() {
        if (rightMonitorFlickerTimeoutId !== null) {
          clearTimeout(rightMonitorFlickerTimeoutId);
          rightMonitorFlickerTimeoutId = null;
        }
        if (leftMonitorFlickerTimeoutId !== null) {
          clearTimeout(leftMonitorFlickerTimeoutId);
          leftMonitorFlickerTimeoutId = null;
        }
      }

      function setMonitorStaticVisibility(staticOverlayEl, staticVideoEl, shouldShowStatic) {
        if (!staticOverlayEl) {
          return;
        }
        staticOverlayEl.classList.toggle('is-active', shouldShowStatic);
        if (!staticVideoEl) {
          return;
        }
        if (shouldShowStatic) {
          staticVideoEl.currentTime = 0;
          const playPromise = staticVideoEl.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
          return;
        }
        staticVideoEl.pause();
        staticVideoEl.currentTime = 0;
      }

      function scheduleRightMonitorFlicker(shouldShowStaticNext) {
        if (!isBigTvPromptActive) {
          rightMonitorFlickerTimeoutId = null;
          return;
        }
        setMonitorStaticVisibility(
          rightMonitorStaticOverlayEl,
          rightMonitorStaticVideoEl,
          shouldShowStaticNext
        );
        rightMonitorFlickerTimeoutId = window.setTimeout(
          () => scheduleRightMonitorFlicker(!shouldShowStaticNext),
          shouldShowStaticNext ? getRandomMonitorStaticDurationMs() : getRandomMonitorContentDurationMs()
        );
      }

      function scheduleLeftMonitorFlicker(shouldShowStaticNext) {
        if (!isBigTvPromptActive) {
          leftMonitorFlickerTimeoutId = null;
          return;
        }
        setMonitorStaticVisibility(
          leftMonitorStaticOverlayEl,
          leftMonitorStaticVideoEl,
          shouldShowStaticNext
        );
        leftMonitorFlickerTimeoutId = window.setTimeout(
          () => scheduleLeftMonitorFlicker(!shouldShowStaticNext),
          shouldShowStaticNext ? getRandomMonitorStaticDurationMs() : getRandomMonitorContentDurationMs()
        );
      }

      function startMonitorFlickerLoops() {
        clearMonitorFlickerTimeouts();
        const rightStartsStatic = Math.random() < 0.5;
        const leftStartsStatic = Math.random() < 0.5;
        setMonitorStaticVisibility(
          rightMonitorStaticOverlayEl,
          rightMonitorStaticVideoEl,
          rightStartsStatic
        );
        setMonitorStaticVisibility(
          leftMonitorStaticOverlayEl,
          leftMonitorStaticVideoEl,
          leftStartsStatic
        );
        rightMonitorFlickerTimeoutId = window.setTimeout(
          () => scheduleRightMonitorFlicker(!rightStartsStatic),
          rightStartsStatic ? getRandomMonitorStaticDurationMs() : getRandomMonitorContentDurationMs()
        );
        leftMonitorFlickerTimeoutId = window.setTimeout(
          () => scheduleLeftMonitorFlicker(!leftStartsStatic),
          leftStartsStatic ? getRandomMonitorStaticDurationMs() : getRandomMonitorContentDurationMs()
        );
      }

      function stopMonitorFlickerLoops() {
        clearMonitorFlickerTimeouts();
        setMonitorStaticVisibility(rightMonitorStaticOverlayEl, rightMonitorStaticVideoEl, false);
        setMonitorStaticVisibility(leftMonitorStaticOverlayEl, leftMonitorStaticVideoEl, false);
      }

      function updateBigTvPromptInput() {
        if (!bigTvPromptInputEl) {
          return;
        }
        bigTvPromptInputEl.textContent = bigTvPromptInputValue;
        if (bigTvPromptHiddenInputEl && bigTvPromptHiddenInputEl.value !== bigTvPromptInputValue) {
          bigTvPromptHiddenInputEl.value = bigTvPromptInputValue;
        }
      }

      function setBigTvPromptSecretRevealed(isRevealed, { temporary = false } = {}) {
        if (bigTvPromptSecretRevealTimeoutId) {
          window.clearTimeout(bigTvPromptSecretRevealTimeoutId);
          bigTvPromptSecretRevealTimeoutId = null;
        }
        if (!bigTvPromptSecretBoxEl) {
          return;
        }
        bigTvPromptSecretBoxEl.classList.toggle('is-revealed', isRevealed);
        if (isRevealed && temporary) {
          bigTvPromptSecretRevealTimeoutId = window.setTimeout(() => {
            if (bigTvPromptSecretBoxEl) {
              bigTvPromptSecretBoxEl.classList.remove('is-revealed');
            }
            bigTvPromptSecretRevealTimeoutId = null;
          }, 1600);
        }
      }

      function showBigTvPromptOverlay() {
        if (!bigTvPromptOverlayEl) {
          return;
        }
        isBigTvPromptActive = true;
        bigTvPromptInputValue = '';
        updateBigTvPromptInput();
        if (bigTvPromptSecretEl) {
          bigTvPromptSecretEl.textContent = BIG_TV_PROMPT_SECRET_TEXT;
        }
        setBigTvPromptSecretRevealed(false);
        bigTvPromptOverlayEl.classList.add('is-active');
        syncBigTvContentVisibility();
        startMonitorFlickerLoops();
        if (bigTvPromptHiddenInputEl) {
          bigTvPromptHiddenInputEl.value = '';
          bigTvPromptHiddenInputEl.focus();
        }
      }

      function hideBigTvPromptOverlay({ clearInput = true } = {}) {
        isBigTvPromptActive = false;
        if (bigTvPromptOverlayEl) {
          bigTvPromptOverlayEl.classList.remove('is-active');
        }
        if (clearInput) {
          bigTvPromptInputValue = '';
          updateBigTvPromptInput();
        }
        if (bigTvPromptHiddenInputEl) {
          bigTvPromptHiddenInputEl.blur();
          bigTvPromptHiddenInputEl.value = '';
        }
        setBigTvPromptSecretRevealed(false);
        stopMonitorFlickerLoops();
        syncBigTvContentVisibility();
      }

      function setNedryGateVideoSource(sourceUrl) {
        if (!nedryGateVideoEl) {
          return;
        }
        if (nedryGateVideoEl.getAttribute('src') === sourceUrl) {
          return;
        }
        nedryGateVideoEl.setAttribute('src', sourceUrl);
        nedryGateVideoEl.src = sourceUrl;
        nedryGateVideoEl.load();
      }

      async function playBigTvStaticPass(sequenceToken, getSequenceToken = () => bigTvPromptSequenceToken) {
        if (!aquariumStaticOverlayEl || !aquariumStaticVideoEl) {
          return false;
        }
        aquariumStaticOverlayEl.classList.add('is-active');
        aquariumStaticVideoEl.currentTime = 0;
        syncBigTvContentVisibility();
        try {
          await aquariumStaticVideoEl.play();
        } catch (error) {
          if (error?.name !== 'AbortError') {
            console.warn('Unable to play big TV static overlay.', error);
          }
          return false;
        }
        const hasEnded = await waitForMediaPlaybackToEnd(aquariumStaticVideoEl);
        return hasEnded && sequenceToken === getSequenceToken();
      }

      async function playBigTvVideoPass(sequenceToken, sourceUrl) {
        if (!nedryGateOverlayEl || !nedryGateVideoEl) {
          return false;
        }
        setNedryGateVideoSource(sourceUrl);
        nedryGateOverlayEl.classList.add('is-active');
        nedryGateVideoEl.currentTime = 0;
        syncBigTvContentVisibility();
        try {
          await nedryGateVideoEl.play();
        } catch (error) {
          if (error?.name !== 'AbortError') {
            console.warn('Unable to play big TV overlay video.', error);
          }
          return false;
        }
        const hasEnded = await waitForMediaPlaybackToEnd(nedryGateVideoEl);
        hideNedryGateOverlay();
        setNedryGateVideoSource(NEDRY_GATE_VIDEO_URL);
        return hasEnded && sequenceToken === bigTvPromptSequenceToken;
      }

      function getZeldaSecretAudioElement() {
        if (!zeldaSecretAudioEl) {
          zeldaSecretAudioEl = new Audio(ZELDA_SECRET_AUDIO_URL);
          zeldaSecretAudioEl.preload = 'metadata';
        }
        return zeldaSecretAudioEl;
      }

      function stopZeldaSecretAudioPlayback() {
        if (!zeldaSecretAudioEl) {
          return;
        }
        zeldaSecretAudioEl.pause();
        zeldaSecretAudioEl.currentTime = 0;
      }

      async function playBigTvPromptIntroSequence() {
        bigTvPromptSequenceToken += 1;
        const sequenceToken = bigTvPromptSequenceToken;
        hideBigTvPromptOverlay();
        hideNedryGateOverlay();

        const firstStaticEnded = await playBigTvStaticPass(sequenceToken);
        if (!firstStaticEnded || sequenceToken !== bigTvPromptSequenceToken) {
          hideAquariumStaticOverlay();
          return;
        }

        const nedryGateEnded = await playBigTvVideoPass(sequenceToken, NEDRY_GATE_VIDEO_URL);
        if (!nedryGateEnded || sequenceToken !== bigTvPromptSequenceToken) {
          hideAquariumStaticOverlay();
          return;
        }

        const secondStaticEnded = await playBigTvStaticPass(sequenceToken);
        if (sequenceToken !== bigTvPromptSequenceToken) {
          hideAquariumStaticOverlay();
          return;
        }

        hideAquariumStaticOverlay();
        if (!secondStaticEnded) {
          console.warn('Big TV second static pass failed; showing prompt anyway.');
        }
        showBigTvPromptOverlay();
      }

      async function playBigTvPromptSuccessSequence() {
        bigTvPromptSequenceToken += 1;
        const sequenceToken = bigTvPromptSequenceToken;
        hideBigTvPromptOverlay();
        hideNedryGateOverlay();

        const zeldaAudio = getZeldaSecretAudioElement();
        stopZeldaSecretAudioPlayback();
        const zeldaPlayPromise = zeldaAudio.play();
        if (zeldaPlayPromise && typeof zeldaPlayPromise.catch === 'function') {
          zeldaPlayPromise.catch((error) => {
            if (error?.name !== 'AbortError') {
              console.warn('Unable to play Zelda secret audio.', error);
            }
          });
        }

        // Rickroll starts as soon as static ends — do not wait for Zelda audio.
        const staticEnded = await playBigTvStaticPass(sequenceToken);

        if (sequenceToken !== bigTvPromptSequenceToken) {
          hideAquariumStaticOverlay();
          stopZeldaSecretAudioPlayback();
          return;
        }

        hideAquariumStaticOverlay();
        stopZeldaSecretAudioPlayback();
        if (!staticEnded) {
          return;
        }

        const rickrollEnded = await playBigTvVideoPass(sequenceToken, BIG_TV_RICKROLL_VIDEO_URL);
        if (rickrollEnded && sequenceToken === bigTvPromptSequenceToken) {
          window.location.assign(DISCORD_GUEST_INVITE_URL);
        }
      }

      function submitBigTvPrompt() {
        if (!isBigTvPromptActive) {
          return;
        }
        const submittedValue = bigTvPromptInputValue.trim().toLowerCase();
        bigTvPromptInputValue = '';
        updateBigTvPromptInput();
        if (submittedValue === BIG_TV_PROMPT_ACCEPTED_VALUE) {
          playBigTvPromptSuccessSequence();
        }
      }

      function handleBigTvPromptTyping(event) {
        if (!isBigTvPromptActive) {
          return;
        }
        if (event.metaKey || event.ctrlKey || event.altKey) {
          return;
        }
        if (event.key === 'Escape') {
          hideBigTvPromptOverlay();
          return;
        }
        if (event.key === 'Backspace') {
          event.preventDefault();
          bigTvPromptInputValue = bigTvPromptInputValue.slice(0, -1);
          updateBigTvPromptInput();
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          submitBigTvPrompt();
          return;
        }
        if (event.key.length === 1) {
          event.preventDefault();
          bigTvPromptInputValue += event.key;
          updateBigTvPromptInput();
        }
      }

      function clamp(value, min, max) {
        return Math.max(min, Math.min(value, max));
      }

      function isFiniteNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
      }

      function frameBoundsToScreenBounds(frameBounds, insets) {
        const usableWidthRatio = Math.max(MIN_MONITOR_RATIO_DENOMINATOR, 1 - insets.left - insets.right);
        const usableHeightRatio = Math.max(MIN_MONITOR_RATIO_DENOMINATOR, 1 - insets.top - insets.bottom);
        const x = frameBounds.x + (frameBounds.w * insets.left);
        const y = frameBounds.y + (frameBounds.h * insets.top);
        const w = frameBounds.w * usableWidthRatio;
        const h = frameBounds.h * usableHeightRatio;
        return {
          x: Math.round(x),
          y: Math.round(y),
          w: Math.round(w),
          h: Math.round(h)
        };
      }

      function screenBoundsToFrameBounds(screenBounds, insets) {
        const usableWidthRatio = Math.max(MIN_MONITOR_RATIO_DENOMINATOR, 1 - insets.left - insets.right);
        const usableHeightRatio = Math.max(MIN_MONITOR_RATIO_DENOMINATOR, 1 - insets.top - insets.bottom);
        const w = screenBounds.w / usableWidthRatio;
        const h = screenBounds.h / usableHeightRatio;
        const x = screenBounds.x - (w * insets.left);
        const y = screenBounds.y - (h * insets.top);
        return {
          x: Math.round(x),
          y: Math.round(y),
          w: Math.round(w),
          h: Math.round(h)
        };
      }

      function normalizeLegacyMonitorOverlayControlBounds(spot, fallback, { allowLegacyNormalization = true } = {}) {
        if (!allowLegacyNormalization) return spot;
        const insets = MONITOR_SCREEN_INSETS_BY_CONTROL_ID.get(spot.id);
        const legacyFrameBounds = MONITOR_FRAME_BOUNDS_BY_OVERLAY_CONTROL_ID.get(spot.id);
        if (!insets || !legacyFrameBounds) return spot;
        const resemblesLegacyFrameBounds =
          Math.abs(spot.x - legacyFrameBounds.x) <= LEGACY_MONITOR_BOUNDS_TOLERANCE_PX &&
          Math.abs(spot.y - legacyFrameBounds.y) <= LEGACY_MONITOR_BOUNDS_TOLERANCE_PX &&
          Math.abs(spot.w - legacyFrameBounds.w) <= LEGACY_MONITOR_BOUNDS_TOLERANCE_PX &&
          Math.abs(spot.h - legacyFrameBounds.h) <= LEGACY_MONITOR_BOUNDS_TOLERANCE_PX;
        if (!resemblesLegacyFrameBounds) {
          return spot;
        }
        const normalizedScreenBounds = frameBoundsToScreenBounds(spot, insets);
        return {
          ...spot,
          x: normalizedScreenBounds.x,
          y: normalizedScreenBounds.y,
          w: Math.max(MIN_HOTSPOT_SIZE, normalizedScreenBounds.w),
          h: Math.max(MIN_HOTSPOT_SIZE, normalizedScreenBounds.h)
        };
      }

      function normalizeLegacyMonitorSideFrameControlBounds(spot, fallback) {
        const insets = MONITOR_SCREEN_INSETS_BY_SIDE_FRAME_CONTROL_ID.get(spot.id);
        if (!insets) return spot;
        const legacyScreenBounds = frameBoundsToScreenBounds(fallback, insets);
        const resemblesLegacyScreenBounds =
          Math.abs(spot.w - legacyScreenBounds.w) <= LEGACY_MONITOR_BOUNDS_TOLERANCE_PX &&
          Math.abs(spot.h - legacyScreenBounds.h) <= LEGACY_MONITOR_BOUNDS_TOLERANCE_PX;
        if (!resemblesLegacyScreenBounds) {
          return spot;
        }
        const normalizedFrameBounds = screenBoundsToFrameBounds(spot, insets);
        return {
          ...spot,
          x: normalizedFrameBounds.x,
          y: normalizedFrameBounds.y,
          w: Math.max(MIN_HOTSPOT_SIZE, normalizedFrameBounds.w),
          h: Math.max(MIN_HOTSPOT_SIZE, normalizedFrameBounds.h)
        };
      }

      function sourceHotspotsToRuntime(sourceHotspots) {
        return sourceHotspots.map((spot) => {
          const runtimeSpot = {
            ...spot,
            x: sourceHotspotXToRuntime(spot.id, spot.x)
          };
          if (spot.id === COMMODORE_OVERLAY_CONTROL_ID) {
            runtimeSpot.w = Math.max(COMMODORE_MIN_SOURCE_HITBOX_WIDTH, runtimeSpot.w);
            runtimeSpot.x += COMMODORE_HITBOX_HORIZONTAL_INSET;
            runtimeSpot.w -= COMMODORE_HITBOX_HORIZONTAL_INSET * 2;
            runtimeSpot.h = Math.max(COMMODORE_MIN_SOURCE_HITBOX_HEIGHT, runtimeSpot.h);
            runtimeSpot.y += COMMODORE_HITBOX_VERTICAL_INSET;
            runtimeSpot.h -= COMMODORE_HITBOX_VERTICAL_INSET * 2;
          }
          return runtimeSpot;
        });
      }

      function runtimeHotspotsToSource(runtimeHotspots) {
        return runtimeHotspots.map((spot) => {
          let sourceX = runtimeHotspotXToSource(spot.id, spot.x);
          let sourceY = spot.y;
          let sourceW = spot.w;
          let sourceH = spot.h;
          if (spot.id === COMMODORE_OVERLAY_CONTROL_ID) {
            sourceX -= COMMODORE_HITBOX_HORIZONTAL_INSET;
            sourceW = Math.max(
              COMMODORE_MIN_SOURCE_HITBOX_WIDTH,
              sourceW + (COMMODORE_HITBOX_HORIZONTAL_INSET * 2)
            );
            sourceY -= COMMODORE_HITBOX_VERTICAL_INSET;
            sourceH = Math.max(
              COMMODORE_MIN_SOURCE_HITBOX_HEIGHT,
              sourceH + (COMMODORE_HITBOX_VERTICAL_INSET * 2)
            );
          }
          return {
            id: spot.id,
            x: sourceX,
            y: sourceY,
            w: sourceW,
            h: sourceH,
            ...(spot.locked ? { locked: true } : {})
          };
        });
      }

      function sanitizeSourceHotspots(input) {
        if (!Array.isArray(input)) return null;
        const entriesById = new Map();
        input.forEach((entry) => {
          if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string') return;
          entriesById.set(entry.id, entry);
        });
        const hasModernMonitorSideFrameControls =
          entriesById.has(LEFT_MONITOR_SIDE_FRAME_CONTROL_ID) ||
          entriesById.has(RIGHT_MONITOR_SIDE_FRAME_CONTROL_ID);

        return defaultHotspots.map((fallback) => {
          const entry = entriesById.get(fallback.id);
          const minWidth = fallback.id === COMMODORE_OVERLAY_CONTROL_ID
            ? COMMODORE_MIN_SOURCE_HITBOX_WIDTH
            : MIN_HOTSPOT_SIZE;
          const minHeight = fallback.id === COMMODORE_OVERLAY_CONTROL_ID
            ? COMMODORE_MIN_SOURCE_HITBOX_HEIGHT
            : MIN_HOTSPOT_SIZE;
          if (!entry) return { ...fallback };
          const sanitizedEntry = {
            id: fallback.id,
            x: isFiniteNumber(entry.x) ? Math.round(entry.x) : fallback.x,
            y: isFiniteNumber(entry.y) ? Math.round(entry.y) : fallback.y,
            w: isFiniteNumber(entry.w) ? Math.max(minWidth, Math.round(entry.w)) : fallback.w,
            h: isFiniteNumber(entry.h) ? Math.max(minHeight, Math.round(entry.h)) : fallback.h,
            ...(entry.locked === true ? { locked: true } : {})
          };
          const normalizedOverlayControlBounds = normalizeLegacyMonitorOverlayControlBounds(sanitizedEntry, fallback, {
            allowLegacyNormalization: !hasModernMonitorSideFrameControls
          });
          return normalizeLegacyMonitorSideFrameControlBounds(normalizedOverlayControlBounds, fallback);
        });
      }

      function getSavedHotspotsFromDom() {
        const saved = [];
        hotspotLayer.querySelectorAll('.hotspot').forEach((el) => {
          const entry = {
            id: el.id,
            x: Math.round(parseFloat(el.style.left)),
            y: Math.round(parseFloat(el.style.top)),
            w: Math.round(parseFloat(el.style.width)),
            h: Math.round(parseFloat(el.style.height))
          };
          if (el.classList.contains('locked-debug-hotspot')) {
            entry.locked = true;
          }
          saved.push(entry);
        });
        return saved;
      }

      function getRuntimeHotspotById(id) {
        return hotspots.find((spot) => spot.id === id) || null;
      }

      function rectFromBounds(bounds) {
        return {
          x: bounds.x,
          y: bounds.y,
          w: bounds.w,
          h: bounds.h
        };
      }

      function getOverlayRect(overlayId) {
        let controlHotspotId = OVERLAY_ID_TO_CONTROL_ID.get(overlayId);
        if (!controlHotspotId && overlayId === AQUARIUM_OVERLAY_ID) {
          controlHotspotId = DISCORD_OVERLAY_CONTROL_ID;
        }
        if (controlHotspotId) {
          const controlledSpot = getRuntimeHotspotById(controlHotspotId);
          if (controlledSpot) {
            if (overlayId === 'overlay-commodore-screen') {
              return {
                x: controlledSpot.x - COMMODORE_HITBOX_HORIZONTAL_INSET,
                y: controlledSpot.y - COMMODORE_HITBOX_VERTICAL_INSET,
                w: controlledSpot.w + (COMMODORE_HITBOX_HORIZONTAL_INSET * 2),
                h: controlledSpot.h + (COMMODORE_HITBOX_VERTICAL_INSET * 2)
              };
            }
            const monitorInsets = MONITOR_SCREEN_INSETS_BY_OVERLAY_ID.get(overlayId);
            if (monitorInsets) {
              return screenBoundsToFrameBounds(controlledSpot, monitorInsets);
            }
            return rectFromBounds(controlledSpot);
          }
        }

        const fallback = overlayDefaults.find((overlay) => overlay.id === overlayId);
        if (!fallback) return null;
        return rectFromBounds(fallback);
      }

      function syncControlledOverlaysFromHotspots() {
        OVERLAY_CONTROL_TO_OVERLAY_ID.forEach((overlayId, controlHotspotId) => {
          const hotspotEl = document.getElementById(controlHotspotId);
          const overlayEl = overlayElementsById.get(overlayId);
          if (!hotspotEl || !overlayEl) return;
          if (overlayId === 'overlay-commodore-screen') {
            const hotspotLeft = parseFloat(hotspotEl.style.left);
            const hotspotTop = parseFloat(hotspotEl.style.top);
            const hotspotWidth = parseFloat(hotspotEl.style.width);
            const hotspotHeight = parseFloat(hotspotEl.style.height);
            overlayEl.style.left = `${hotspotLeft - COMMODORE_HITBOX_HORIZONTAL_INSET}px`;
            overlayEl.style.top = `${hotspotTop - COMMODORE_HITBOX_VERTICAL_INSET}px`;
            overlayEl.style.width = `${hotspotWidth + (COMMODORE_HITBOX_HORIZONTAL_INSET * 2)}px`;
            overlayEl.style.height = `${hotspotHeight + (COMMODORE_HITBOX_VERTICAL_INSET * 2)}px`;
            return;
          }
          const monitorInsets = MONITOR_SCREEN_INSETS_BY_OVERLAY_ID.get(overlayId);
          if (monitorInsets) {
            const frameBounds = screenBoundsToFrameBounds(
              {
                x: parseFloat(hotspotEl.style.left),
                y: parseFloat(hotspotEl.style.top),
                w: parseFloat(hotspotEl.style.width),
                h: parseFloat(hotspotEl.style.height)
              },
              monitorInsets
            );
            overlayEl.style.left = `${frameBounds.x}px`;
            overlayEl.style.top = `${frameBounds.y}px`;
            overlayEl.style.width = `${frameBounds.w}px`;
            overlayEl.style.height = `${frameBounds.h}px`;
            return;
          }
          overlayEl.style.left = hotspotEl.style.left;
          overlayEl.style.top = hotspotEl.style.top;
          overlayEl.style.width = hotspotEl.style.width;
          overlayEl.style.height = hotspotEl.style.height;
        });
        const discordOverlayEl = overlayElementsById.get(DISCORD_OVERLAY_ID);
        const aquariumOverlayEl = overlayElementsById.get(AQUARIUM_OVERLAY_ID);
        if (discordOverlayEl && aquariumOverlayEl) {
          aquariumOverlayEl.style.left = discordOverlayEl.style.left;
          aquariumOverlayEl.style.top = discordOverlayEl.style.top;
          aquariumOverlayEl.style.width = discordOverlayEl.style.width;
          aquariumOverlayEl.style.height = discordOverlayEl.style.height;
        }
      }

      function getSourceOutput(sourceHotspots) {
        const lines = sourceHotspots.map((spot) =>
          `  { id: ${JSON.stringify(spot.id)}, x: ${spot.x}, y: ${spot.y}, w: ${spot.w}, h: ${spot.h} },`
        );
        return (
          `const hotspots = [\n${lines.join('\n')}\n` +
          `].map((spot) => ({ ...spot, x: spot.x + SCENE_OFFSET_X }));`
        );
      }

      function persistSaveResultFlash(message) {
        try {
          sessionStorage.setItem(SAVE_RESULT_FLASH_KEY, message);
        } catch (_) {}
      }

      function consumeSaveResultFlash() {
        try {
          const flash = sessionStorage.getItem(SAVE_RESULT_FLASH_KEY);
          if (!flash) return '';
          sessionStorage.removeItem(SAVE_RESULT_FLASH_KEY);
          return flash;
        } catch (_) {
          return '';
        }
      }

      function shouldUseLegacyDataApi(status) {
        return status === 404;
      }

      function extractSourceHotspotsFromLegacyRows(rows) {
        if (!Array.isArray(rows)) return null;
        for (const row of rows) {
          if (!row || row.title !== LEGACY_HOTSPOT_RECORD_TITLE) continue;
          let parsed = null;
          if (typeof row.content === 'string') {
            try {
              parsed = JSON.parse(row.content);
            } catch (_) {}
          } else if (Array.isArray(row.content)) {
            parsed = row.content;
          }
          const sanitized = sanitizeSourceHotspots(parsed);
          if (sanitized) return sanitized;
        }
        return null;
      }

      async function loadHotspotsFromLegacyServer() {
        try {
          const response = await fetch(LEGACY_HOTSPOT_API_PATH, { cache: 'no-store' });
          if (!response.ok) return null;
          const payload = await response.json();
          const sanitized = extractSourceHotspotsFromLegacyRows(payload);
          return sanitized ? sourceHotspotsToRuntime(sanitized) : null;
        } catch (_) {
          return null;
        }
      }

      async function loadHotspotsFromServer() {
        if (hotspotApiMode === 'legacy') {
          return loadHotspotsFromLegacyServer();
        }

        try {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
          const response = await fetch(HOTSPOT_API_PATH, { cache: 'no-store', signal: controller.signal });
          window.clearTimeout(timeoutId);
          if (!response.ok) {
            if (shouldUseLegacyDataApi(response.status)) {
              hotspotApiMode = 'legacy';
              return loadHotspotsFromLegacyServer();
            }
            return null;
          }
          const payload = await response.json();
          const sanitized = sanitizeSourceHotspots(payload?.hotspots);
          return sanitized ? sourceHotspotsToRuntime(sanitized) : null;
        } catch (_) {
          return null;
        }
      }

      function wait(ms) {
        return new Promise((resolve) => {
          window.setTimeout(resolve, ms);
        });
      }

      function encodeDebugSavePassword(value) {
        const source = String(value ?? '');
        return Array.from(source, (char, index) => (
          char.charCodeAt(0) ^ DEBUG_SAVE_PASSWORD_KEY.charCodeAt(index % DEBUG_SAVE_PASSWORD_KEY.length)
        ));
      }

      function hasMatchingDebugSaveCipher(encodedValue) {
        if (encodedValue.length !== DEBUG_SAVE_PASSWORD_CIPHER.length) {
          return false;
        }
        return encodedValue.every((byte, index) => byte === DEBUG_SAVE_PASSWORD_CIPHER[index]);
      }

      function ensureDebugSaveAccess() {
        if (!document.body.classList.contains('debug')) {
          return true;
        }
        if (hasDebugSaveAccess) {
          return true;
        }
        const attempt = window.prompt('Debug save password required.');
        if (attempt === null) {
          if (debugStatus) debugStatus.textContent = 'Debug save cancelled.';
          return false;
        }
        const isValid = hasMatchingDebugSaveCipher(encodeDebugSavePassword(attempt.trim()));
        if (!isValid) {
          if (debugStatus) debugStatus.textContent = 'Debug save password incorrect.';
          return false;
        }
        hasDebugSaveAccess = true;
        if (debugStatus) debugStatus.textContent = 'Debug save unlocked.';
        return true;
      }

      function markSceneReady() {
        window.requestAnimationFrame(() => {
          document.body.classList.remove('scene-loading');
          document.body.classList.add('scene-ready');
          if (perfApi?.mark && perfApi?.measure) {
            perfApi.mark('naimean-scene-ready');
            perfApi.measure('naimean-js-boot', 'naimean-js-boot-start', 'naimean-scene-ready');
            const bootMeasures = perfApi.getEntriesByName('naimean-js-boot');
            const latestBootMeasure = bootMeasures[bootMeasures.length - 1];
            if (latestBootMeasure) {
              updatePerformanceMetric('JS boot', latestBootMeasure.duration);
            }
          }
          renderPerformancePanel();
        });
      }

      async function readResponseErrorText(response) {
        try {
          const payload = await response.clone().json();
          if (payload && typeof payload.error === 'string' && payload.error.trim()) {
            return payload.error.trim();
          }
        } catch (_) {}

        try {
          const text = await response.text();
          if (text && text.trim()) return text.trim();
        } catch (_) {}

        return '';
      }

      async function postHotspotsToLegacyServer(savedSourceHotspots) {
        let lastError = null;
        for (let attempt = 1; attempt <= SAVE_RETRY_ATTEMPTS; attempt += 1) {
          try {
            const response = await fetch(LEGACY_HOTSPOT_API_PATH, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                title: LEGACY_HOTSPOT_RECORD_TITLE,
                content: JSON.stringify(savedSourceHotspots)
              }),
              cache: 'no-store'
            });

            if (!response.ok) {
              const errorDetails = await readResponseErrorText(response);
              throw new Error(
                errorDetails
                  ? `Server save failed (${response.status}): ${errorDetails}`
                  : `Server save failed (${response.status})`
              );
            }

            return;
          } catch (error) {
            lastError = error;
            if (attempt < SAVE_RETRY_ATTEMPTS) {
              await wait(SAVE_RETRY_DELAY_MS * (2 ** (attempt - 1)));
            }
          }
        }

        throw lastError || new Error('Server save failed');
      }

      async function postHotspotsToServer(savedSourceHotspots) {
        if (hotspotApiMode === 'legacy') {
          await postHotspotsToLegacyServer(savedSourceHotspots);
          return;
        }

        let lastError = null;

        for (let attempt = 1; attempt <= SAVE_RETRY_ATTEMPTS; attempt += 1) {
          try {
            const response = await fetch(HOTSPOT_API_PATH, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ hotspots: savedSourceHotspots }),
              cache: 'no-store'
            });

            if (!response.ok) {
              if (shouldUseLegacyDataApi(response.status)) {
                hotspotApiMode = 'legacy';
                await postHotspotsToLegacyServer(savedSourceHotspots);
                return;
              }
              const errorDetails = await readResponseErrorText(response);
              throw new Error(
                errorDetails
                  ? `Server save failed (${response.status}): ${errorDetails}`
                  : `Server save failed (${response.status})`
              );
            }

            return;
          } catch (error) {
            lastError = error;
            if (attempt < SAVE_RETRY_ATTEMPTS) {
              await wait(SAVE_RETRY_DELAY_MS * (2 ** (attempt - 1)));
            }
          }
        }

        throw lastError || new Error('Server save failed');
      }

      function setSaveButtonText(text, disabled = false) {
        saveBtn.textContent = text;
        saveBtn.disabled = disabled;
      }

      function resetSaveButtonSoon() {
        if (saveButtonResetTimeoutId !== null) {
          window.clearTimeout(saveButtonResetTimeoutId);
        }
        saveButtonResetTimeoutId = window.setTimeout(() => {
          setSaveButtonText('Save');
          saveButtonResetTimeoutId = null;
        }, SAVE_BUTTON_RESET_MS);
      }

      function hideSaveModal() {
        saveModal.classList.add('hidden');
      }

      function showSaveFallbackModal(sourceHotspots, message) {
        saveModalTitle.textContent = message;
        saveModalTextarea.value = getSourceOutput(sourceHotspots);
        saveModal.classList.remove('hidden');
      }

      function stopMomentum() {
        if (momentumAnimationFrameId !== null) {
          window.cancelAnimationFrame(momentumAnimationFrameId);
          momentumAnimationFrameId = null;
        }
        momentumVelocityX = 0;
        lastMomentumTimestamp = 0;
      }

      function shouldUseMomentum(pointerType) {
        return pointerType === 'touch' || (pointerType === 'pen' && hasCoarsePointer);
      }

      function addResizeHandles(el) {
        ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].forEach((dir) => {
          const handle = document.createElement('div');
          handle.className = `resize-handle resize-${dir}`;
          handle.dataset.dir = dir;
          handle.setAttribute('aria-hidden', 'true');
          el.appendChild(handle);
        });
      }

      function updateHotspotLabel(el) {
        const label = el.querySelector('.hotspot-label');
        if (!label) return;
        const readableLabel = el.dataset.label || el.id;
        const x = Math.round(parseFloat(el.style.left));
        const y = Math.round(parseFloat(el.style.top));
        const w = Math.round(parseFloat(el.style.width));
        const h = Math.round(parseFloat(el.style.height));
        label.textContent = `${readableLabel} (${x}, ${y}) ${w}×${h}`;
      }

      function getDebugHotspotElements() {
        return Array.from(hotspotLayer.querySelectorAll('.hotspot'));
      }

      function getDebugHotspotLabel(hotspotEl) {
        return hotspotEl.dataset.label || hotspotEl.id;
      }

      function getSelectedDebugHotspotElement() {
        const selectedId = debugObjectSelect?.value;
        if (!selectedId) return null;
        return document.getElementById(selectedId);
      }

      function getHotspotDefaultUrl(hotspotId) {
        if (hotspotId === NOAHS_ARCADE_HOTSPOT_ID) return NOAHS_ARCADE_URL;
        if (hotspotId === 'chapel') return CHAPEL_URL;
        if (hotspotId === PENCIL_SHARPENER_HOTSPOT_ID) return NOTES_URL;
        if (WHITEBOARD_HOTSPOT_IDS.has(hotspotId)) {
          return WHITEBOARD_HOTSPOT_URLS[hotspotId] || WHITEBOARD_HOTSPOT_URLS.whiteboard;
        }
        return null;
      }

      function loadDenUrlOverrides() {
        try {
          const stored = window.localStorage.getItem(DEN_URL_OVERRIDES_STORAGE_KEY);
          if (!stored) return {};
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        } catch {
          // ignore
        }
        return {};
      }

      function saveDenUrlOverride(hotspotId, url) {
        if (!ensureDebugSaveAccess()) {
          return false;
        }
        const trimmed = typeof url === 'string' ? url.trim() : '';
        if (trimmed) {
          denUrlOverrides[hotspotId] = trimmed;
        } else {
          delete denUrlOverrides[hotspotId];
        }
        try {
          window.localStorage.setItem(DEN_URL_OVERRIDES_STORAGE_KEY, JSON.stringify(denUrlOverrides));
          return true;
        } catch {
          // ignore
          return false;
        }
      }

      function getHotspotEffectiveUrl(hotspotId) {
        if (denUrlOverrides[hotspotId]) return denUrlOverrides[hotspotId];
        return getHotspotDefaultUrl(hotspotId);
      }

      function refreshDebugObjectActions() {
        if (!debugObjectLockButton || !debugObjectUnlockButton || !debugObjectSelect) {
          return;
        }
        const selectedEl = getSelectedDebugHotspotElement();
        const hasSelection = !!selectedEl;
        const isLocked = hasSelection && selectedEl.classList.contains('locked-debug-hotspot');
        debugObjectLockButton.disabled = !hasSelection || isLocked;
        debugObjectUnlockButton.disabled = !hasSelection || !isLocked;

        if (debugUrlRow && debugUrlInput) {
          const selectedId = hasSelection ? selectedEl.id : null;
          const defaultUrl = selectedId ? getHotspotDefaultUrl(selectedId) : null;
          if (defaultUrl !== null) {
            debugUrlRow.hidden = false;
            debugUrlInput.value = getHotspotEffectiveUrl(selectedId);
            debugUrlInput.placeholder = defaultUrl;
          } else {
            debugUrlRow.hidden = true;
            debugUrlInput.value = '';
          }
        }
      }

      function refreshDebugObjectSelectOptions() {
        if (!debugObjectSelect) {
          return;
        }

        const previousSelection = debugObjectSelect.value;
        const hotspotElements = getDebugHotspotElements()
          .sort((a, b) => getDebugHotspotLabel(a).localeCompare(getDebugHotspotLabel(b)));

        debugObjectSelect.textContent = '';

        if (!hotspotElements.length) {
          const option = document.createElement('option');
          option.value = '';
          option.textContent = 'No objects available';
          debugObjectSelect.appendChild(option);
          debugObjectSelect.disabled = true;
          refreshDebugObjectActions();
          return;
        }

        hotspotElements.forEach((hotspotEl) => {
          const option = document.createElement('option');
          option.value = hotspotEl.id;
          option.textContent = getDebugHotspotLabel(hotspotEl);
          debugObjectSelect.appendChild(option);
        });

        debugObjectSelect.disabled = false;
        if (previousSelection && hotspotElements.some((hotspotEl) => hotspotEl.id === previousSelection)) {
          debugObjectSelect.value = previousSelection;
        } else {
          debugObjectSelect.value = hotspotElements[0].id;
        }
        refreshDebugObjectActions();
      }

      function setHotspotDebugLockState(hotspotId, isLocked) {
        const hotspotEl = document.getElementById(hotspotId);
        if (!hotspotEl) {
          return;
        }

        hotspotEl.classList.toggle('locked-debug-hotspot', isLocked);
        if (isLocked) {
          LOCKED_DEBUG_HOTSPOT_IDS.add(hotspotId);
        } else {
          LOCKED_DEBUG_HOTSPOT_IDS.delete(hotspotId);
        }
        refreshDebugObjectActions();
      }

      // ── Flip Clock helpers ────────────────────────────────

      function openClockApp() {
        const ua = navigator.userAgent;
        if (/Windows/i.test(ua)) {
          window.location.href = CLOCK_URL_WINDOWS;
        } else if (isIOSDevice) {
          window.location.href = CLOCK_URL_IOS;
        } else {
          window.open('https://time.is', '_blank', 'noopener,noreferrer');
        }
      }

      function openCalendarApp() {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        window.location.href = isMobile ? CALENDAR_URL_MOBILE : CALENDAR_URL_DESKTOP;
      }

      function loadCommodorePowerState() {
        try {
          return sessionStorage.getItem(COMMODORE_POWER_STATE_STORAGE_KEY) === 'true';
        } catch {
          return false;
        }
      }

      function saveCommodorePowerState() {
        try {
          sessionStorage.setItem(COMMODORE_POWER_STATE_STORAGE_KEY, String(isCommodorePoweringOn));
        } catch (error) {
          console.warn('Unable to persist Commodore power state.', error);
        }
      }

      function syncStoredCommodorePowerState() {
        isCommodorePoweringOn = loadCommodorePowerState();
        commodorePowerButtonEl?.classList.toggle('on', isCommodorePoweringOn);
      }

      function cancelMonitorPowerTimeouts() {
        monitorPowerTimeoutIds.forEach((id) => window.clearTimeout(id));
        monitorPowerTimeoutIds = [];
      }

      function isMonitorPoweredOn(shadowOverlayEl) {
        return !!shadowOverlayEl && shadowOverlayEl.classList.contains('is-monitor-on');
      }

      function isBigTvMonitorInteractive() {
        return isMonitorPoweredOn(bigTvShadowOverlayEl);
      }

      function isLeftMonitorInteractive() {
        return isMonitorPoweredOn(leftMonitorShadowOverlayEl);
      }

      function isRightMonitorInteractive() {
        return isMonitorPoweredOn(rightMonitorShadowOverlayEl);
      }

      function resetMonitorsToOffState() {
        isDvdCornerCountEnabled = false;
        stopAquariumPlaybackSequence();
        hideBigTvToolsOverlay();
        hideLoginOverlay();
        hideCalendarBigTvOverlay();
        hideBigTvPromptOverlay();
        hideNedryGateOverlay();
        hideAquariumStaticOverlay();
        stopZeldaSecretAudioPlayback();
        stopBigTvDvdAnimation();
        stopMonitorFlickerLoops();
        if (rightMonitorShrimpLogoOverlayEl) {
          rightMonitorShrimpLogoOverlayEl.classList.remove('is-active');
        }
        syncDiscordButtonUi();
        setLeftMonitorState(DEFAULT_LEFT_MONITOR_STATE);
        if (isBigTvFullscreenTarget(document.fullscreenElement)) {
          void exitBigTvFullscreen();
        }
      }

      function animateMonitorShadowOn(el) {
        if (!el) return;
        if (el.classList.contains('is-monitor-on') && !el.classList.contains('tv-turning-off')) return;
        el.classList.remove('is-monitor-on', 'tv-turning-off', 'tv-turning-on');
        void el.offsetHeight;
        el.classList.add('tv-turning-on');
        el.addEventListener('animationend', () => {
          el.classList.remove('tv-turning-on');
          el.classList.add('is-monitor-on');
          if (
            leftMonitorSelectedState === 'tools' &&
            isLeftMonitorInteractive() &&
            isBigTvMonitorInteractive()
          ) {
            void activateBigTvToolsMode();
          } else if (
            leftMonitorSelectedState === 'login' &&
            isLeftMonitorInteractive() &&
            isBigTvMonitorInteractive()
          ) {
            void activateLoginMode();
          } else if (
            leftMonitorSelectedState === 'calendar' &&
            isLeftMonitorInteractive() &&
            isBigTvMonitorInteractive()
          ) {
            void activateCalendarMode();
          }
          syncDvdScreensaverState();
        }, { once: true });
      }

      function animateMonitorShadowOff(el) {
        if (!el) return;
        el.classList.remove('tv-turning-on');
        el.classList.add('is-monitor-on');
        void el.offsetHeight;
        el.classList.remove('is-monitor-on');
        el.classList.add('tv-turning-off');
        el.addEventListener('animationend', () => {
          el.classList.remove('tv-turning-off');
          syncDvdScreensaverState();
        }, { once: true });
      }

      function navigateToCommodoreFromDen() {
        try {
          sessionStorage.setItem(COMMODORE_NAV_SOURCE_STORAGE_KEY, COMMODORE_NAV_SOURCE_DEN);
        } catch (error) {
          console.warn('Unable to persist Commodore navigation source.', error);
        }
        window.location.assign(COMMODORE_URL);
      }

      function triggerCommodorePowerOnSequence() {
        if (isCommodorePoweringOn) {
          isCommodorePoweringOn = false;
          saveCommodorePowerState();
          cancelMonitorPowerTimeouts();
          resetMonitorsToOffState();
          if (commodorePowerButtonEl) {
            commodorePowerButtonEl.classList.remove('on');
          }
          [commodoreShadowOverlayEl, leftMonitorShadowOverlayEl, rightMonitorShadowOverlayEl].forEach(animateMonitorShadowOff);
          return;
        }
        isCommodorePoweringOn = true;
        saveCommodorePowerState();
        if (commodorePowerButtonEl) {
          commodorePowerButtonEl.classList.add('on');
        }
        animateMonitorShadowOn(commodoreShadowOverlayEl);
        [leftMonitorShadowOverlayEl, rightMonitorShadowOverlayEl].forEach((el) => {
          if (!el) return;
          const delay = COMMODORE_MONITOR_TURN_ON_MS + Math.floor(Math.random() * MONITOR_POWER_CASCADE_MS);
          const id = window.setTimeout(() => animateMonitorShadowOn(el), delay);
          monitorPowerTimeoutIds.push(id);
        });
      }

      function createFlipCard(isMonth) {
        const el = document.createElement('div');
        el.className = isMonth ? 'fc-month' : 'fc-digit';
        el.dataset.val = '';

        const top = document.createElement('div');
        top.className = 'fc-top';
        const topNum = document.createElement('span');
        topNum.className = 'fc-num';
        top.appendChild(topNum);

        const bot = document.createElement('div');
        bot.className = 'fc-bot';
        const botNum = document.createElement('span');
        botNum.className = 'fc-num';
        bot.appendChild(botNum);

        el.appendChild(top);
        el.appendChild(bot);
        return el;
      }

      function setFlipCard(el, newVal, animate) {
        const oldVal = el.dataset.val;
        if (oldVal === newVal) return;

        const topNum = el.querySelector('.fc-top .fc-num');
        const botNum = el.querySelector('.fc-bot .fc-num');

        if (!animate || oldVal === '') {
          topNum.textContent = newVal;
          botNum.textContent = newVal;
          el.dataset.val = newVal;
          return;
        }

        // Show new bottom value immediately (hidden behind flap during phase 1)
        botNum.textContent = newVal;

        // Phase 1: old top folds away
        const flap1 = document.createElement('div');
        flap1.className = 'fc-flap fc-flap-p1';
        const flap1Num = document.createElement('span');
        flap1Num.className = 'fc-num';
        flap1Num.textContent = oldVal;
        flap1.appendChild(flap1Num);
        el.appendChild(flap1);

        flap1.addEventListener('animationend', () => {
          flap1.remove();
          topNum.textContent = newVal;

          // Phase 2: new top unfolds in
          const flap2 = document.createElement('div');
          flap2.className = 'fc-flap fc-flap-p2';
          const flap2Num = document.createElement('span');
          flap2Num.className = 'fc-num';
          flap2Num.textContent = newVal;
          flap2.appendChild(flap2Num);
          el.appendChild(flap2);

          flap2.addEventListener('animationend', () => {
            flap2.remove();
          }, { once: true });
        }, { once: true });

        el.dataset.val = newVal;
      }

      function applyRadioTuningPosition(scaleBlock, value) {
        const clamped = clamp(value, 0, 1);
        scaleBlock.style.setProperty('--rc-tuning-position', `${(clamped * 100).toFixed(2)}%`);
        return clamped;
      }

      function getRadioStationStrength(position) {
        const clampedPosition = clamp(position, 0, 1);
        const strongestStationDistance = RADIO_TUNING_STATION_POSITIONS.reduce(
          (closest, stationPosition) => Math.min(closest, Math.abs(clampedPosition - stationPosition)),
          Number.POSITIVE_INFINITY
        );
        const ratio = strongestStationDistance / RADIO_TUNING_STATION_WIDTH;
        return clamp(Math.exp(-(ratio * ratio) * 2), 0, 1);
      }

      function resetRadioTuningPlayback(audioEl) {
        audioEl.playbackRate = 1;
        audioEl.volume = 1;
      }

      function ensureRadioTuningLoopPlayback(audioEl) {
        if (!audioEl.paused) return;
        const playPromise = audioEl.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
      }

      function stopRadioTuningLoopPlayback(audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
        audioEl.playbackRate = 1;
        audioEl.volume = 1;
        if (audioEl.__radioTuningState) {
          audioEl.__radioTuningState.movementEnergy = 0;
        }
      }

      function getNextRadioTuningAudioUrl() {
        if (!flipClockRadioTuningAudioCycle.length) {
          flipClockRadioTuningAudioCycle = [...RADIO_TUNING_AUDIO_URLS];
          for (let i = flipClockRadioTuningAudioCycle.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            const swapValue = flipClockRadioTuningAudioCycle[i];
            flipClockRadioTuningAudioCycle[i] = flipClockRadioTuningAudioCycle[j];
            flipClockRadioTuningAudioCycle[j] = swapValue;
          }
        }
        return flipClockRadioTuningAudioCycle.pop();
      }

      function getRadioTuningAudioElement(audioUrl) {
        let audioEl = flipClockRadioTuningAudioElsByUrl.get(audioUrl);
        if (!audioEl) {
          audioEl = new Audio(audioUrl);
          audioEl.preload = 'metadata';
          audioEl.loop = true;
          flipClockRadioTuningAudioElsByUrl.set(audioUrl, audioEl);
        }
        return audioEl;
      }

      function startFlipClock(container) {
        const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun',
                             'Jul','Aug','Sep','Oct','Nov','Dec'];

        // Cache card references once to avoid repeated DOM queries
        const cards = {
          h1: container.querySelector('[data-key="h1"]'),
          h2: container.querySelector('[data-key="h2"]'),
          m1: container.querySelector('[data-key="m1"]'),
          m2: container.querySelector('[data-key="m2"]'),
          dateBadge: container.querySelector('[data-key="date-badge"]')
        };

        function tick(animate) {
          const now = new Date();
          const hours24 = now.getHours();
          const hh = String(hours24).padStart(2, '0');
          const mm = String(now.getMinutes()).padStart(2, '0');
          const dateBadge = `${MONTH_NAMES[now.getMonth()].toUpperCase()} ${String(now.getDate()).padStart(2, '0')}`;

          setFlipCard(cards.h1, hh[0], animate);
          setFlipCard(cards.h2, hh[1], animate);
          setFlipCard(cards.m1, mm[0], animate);
          setFlipCard(cards.m2, mm[1], animate);
          if (cards.dateBadge) {
            cards.dateBadge.textContent = dateBadge;
          }
        }

        tick(false); // Initial render without animation

        // Align the first animated tick to the next full second boundary,
        // then switch to a regular 1 s interval for subsequent ticks.
        const msUntilNextSecond = 1000 - new Date().getMilliseconds();
        flipClockAlignTimeoutId = setTimeout(() => {
          flipClockAlignTimeoutId = null;
          tick(true);
          flipClockIntervalId = setInterval(() => tick(true), 1000);
        }, msUntilNextSecond);
      }

      // ─────────────────────────────────────────────────────

      function createSceneTiles() {
        sceneLayer.textContent = '';
        SCENE_TILE_IMAGE_URLS.forEach((sources, index) => {
          const tile = document.createElement('picture');
          tile.className = 'scene-tile';
          tile.style.left = `${index * TILE_WIDTH}px`;

          const avifSource = document.createElement('source');
          avifSource.type = 'image/avif';
          avifSource.srcset = sources.avif;
          tile.appendChild(avifSource);

          const webpSource = document.createElement('source');
          webpSource.type = 'image/webp';
          webpSource.srcset = sources.webp;
          tile.appendChild(webpSource);

          const image = document.createElement('img');
          image.src = sources.png;
          image.alt = '';
          image.loading = index === 0 ? 'eager' : 'lazy';
          image.decoding = 'async';
          image.fetchPriority = index === 0 ? 'high' : 'auto';
          tile.appendChild(image);

          sceneLayer.appendChild(tile);
        });
      }

      function createAshtraySmokeEffect() {
        if (!effectsLayer) {
          return;
        }
        effectsLayer.querySelector(`#${ASHTRAY_SMOKE_EFFECT_ID}`)?.remove();
        overlayElementsById.delete(ASHTRAY_SMOKE_EFFECT_ID);

        const smokeControlSpot = getRuntimeHotspotById(ASHTRAY_SMOKE_CONTROL_ID);
        const defaultSmokeRiseDistance = Math.max(
          MIN_SMOKE_RISE_DISTANCE,
          Math.round((ASHTRAY_SMOKE_Y - SMOKE_CEILING_Y) * SMOKE_FADE_TO_CEILING_RATIO)
        );
        const defaultSmokeHeight = defaultSmokeRiseDistance + ASHTRAY_SMOKE_TAIL_HEIGHT;
        const smokeHeight = Math.max(
          ASHTRAY_SMOKE_TAIL_HEIGHT + MIN_HOTSPOT_SIZE,
          Math.round(smokeControlSpot?.h ?? defaultSmokeHeight)
        );
        const smokeRiseDistance = Math.max(
          MIN_SMOKE_RISE_DISTANCE,
          Math.round(smokeHeight - ASHTRAY_SMOKE_TAIL_HEIGHT)
        );
        const smokeEffectEl = document.createElement('div');
        smokeEffectEl.id = ASHTRAY_SMOKE_EFFECT_ID;
        smokeEffectEl.className = 'ashtray-smoke-effect';
        smokeEffectEl.style.left = `${Math.round(
          smokeControlSpot?.x ?? (SCENE_OFFSET_X + ASHTRAY_SMOKE_SOURCE_X - Math.round(ASHTRAY_SMOKE_DEFAULT_WIDTH / 2))
        )}px`;
        smokeEffectEl.style.top = `${Math.round(
          smokeControlSpot?.y ?? (ASHTRAY_SMOKE_Y - smokeRiseDistance + SMOKE_SOURCE_VERTICAL_OFFSET)
        )}px`;
        smokeEffectEl.style.width = `${Math.max(
          MIN_HOTSPOT_SIZE,
          Math.round(smokeControlSpot?.w ?? ASHTRAY_SMOKE_DEFAULT_WIDTH)
        )}px`;
        smokeEffectEl.style.height = `${smokeHeight}px`;
        smokeEffectEl.style.setProperty('--smoke-rise-distance', `${smokeRiseDistance}px`);
        smokeEffectEl.style.setProperty('--smoke-tail-height', `${ASHTRAY_SMOKE_TAIL_HEIGHT}px`);

        const wisps = [
          { delay: -0.2, duration: 8.8, startX: -24, driftX: 10, curlA: 22, curlB: -16, angle: -14, variant: 'rise' },
          { delay: -0.9, duration: 12.7, startX: -36, driftX: 34, curlA: -18, curlB: 28, angle: 11, variant: 'depth' },
          { delay: -1.6, duration: 9.5, startX: -8, driftX: 26, curlA: -20, curlB: 16, angle: 13, variant: 'rise' },
          { delay: -2.9, duration: 10.1, startX: 4, driftX: -18, curlA: 18, curlB: -20, angle: -18, variant: 'rise' },
          { delay: -3.7, duration: 13.4, startX: 30, driftX: -36, curlA: 20, curlB: -30, angle: -10, variant: 'depth' },
          { delay: -4.4, duration: 11.4, startX: 16, driftX: 30, curlA: -26, curlB: 21, angle: 16, variant: 'swirl' },
          { delay: -5.9, duration: 9.8, startX: -30, driftX: 12, curlA: 14, curlB: -14, angle: -12, variant: 'rise' },
          { delay: -7.2, duration: 10.9, startX: 22, driftX: -24, curlA: -18, curlB: 18, angle: 15, variant: 'swirl' },
          { delay: -8.4, duration: 9.2, startX: -16, driftX: 20, curlA: 20, curlB: -18, angle: -16, variant: 'rise' }
        ];

        wisps.forEach((wispConfig) => {
          const wispEl = document.createElement('span');
          wispEl.className = 'ashtray-smoke-wisp';
          if (wispConfig.variant === 'swirl') {
            wispEl.classList.add('ashtray-smoke-wisp-swirl');
          } else if (wispConfig.variant === 'depth') {
            wispEl.classList.add('ashtray-smoke-wisp-depth');
          }
          wispEl.style.setProperty('--smoke-delay', `${wispConfig.delay}s`);
          wispEl.style.setProperty('--smoke-duration', `${wispConfig.duration}s`);
          wispEl.style.setProperty('--smoke-start-x', `${wispConfig.startX}px`);
          wispEl.style.setProperty('--smoke-drift-x', `${wispConfig.driftX}px`);
          wispEl.style.setProperty('--smoke-curl-a', `${wispConfig.curlA}px`);
          wispEl.style.setProperty('--smoke-curl-b', `${wispConfig.curlB}px`);
          wispEl.style.setProperty('--smoke-curl-angle', `${wispConfig.angle}deg`);
          smokeEffectEl.appendChild(wispEl);
        });

        effectsLayer.appendChild(smokeEffectEl);
        overlayElementsById.set(ASHTRAY_SMOKE_EFFECT_ID, smokeEffectEl);
      }

      function createAshtrayCigaretteEffect() {
        if (!effectsLayer) {
          return;
        }
        effectsLayer.querySelector(`#${ASHTRAY_CIGARETTE_EFFECT_ID}`)?.remove();
        overlayElementsById.delete(ASHTRAY_CIGARETTE_EFFECT_ID);

        const cigaretteControlSpot = getRuntimeHotspotById(ASHTRAY_CIGARETTE_CONTROL_ID);
        const cigaretteEffectEl = document.createElement('div');
        cigaretteEffectEl.id = ASHTRAY_CIGARETTE_EFFECT_ID;
        cigaretteEffectEl.className = 'ashtray-cigarette-effect';
        cigaretteEffectEl.style.left = `${Math.round(
          cigaretteControlSpot?.x ?? (SCENE_OFFSET_X + ASHTRAY_CIGARETTE_DEFAULT_BOUNDS.x)
        )}px`;
        cigaretteEffectEl.style.top = `${Math.round(
          cigaretteControlSpot?.y ?? ASHTRAY_CIGARETTE_DEFAULT_BOUNDS.y
        )}px`;
        cigaretteEffectEl.style.width = `${Math.max(
          MIN_HOTSPOT_SIZE,
          Math.round(cigaretteControlSpot?.w ?? ASHTRAY_CIGARETTE_DEFAULT_BOUNDS.w)
        )}px`;
        cigaretteEffectEl.style.height = `${Math.max(
          MIN_HOTSPOT_SIZE,
          Math.round(cigaretteControlSpot?.h ?? ASHTRAY_CIGARETTE_DEFAULT_BOUNDS.h)
        )}px`;

        const cigaretteEl = document.createElement('span');
        cigaretteEl.className = 'ashtray-cigarette';
        const emberEl = document.createElement('span');
        emberEl.className = 'ashtray-cigarette-ember';
        cigaretteEl.appendChild(emberEl);
        cigaretteEffectEl.appendChild(cigaretteEl);

        effectsLayer.appendChild(cigaretteEffectEl);
        overlayElementsById.set(ASHTRAY_CIGARETTE_EFFECT_ID, cigaretteEffectEl);
      }

      function createHotspots(hotspotList) {
        hotspotLayer.textContent = '';
        const toTitleCase = (value) =>
          value
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        hotspotList.forEach((spot) => {
          const readableLabel = HOTSPOT_READABLE_LABELS.get(spot.id) ||
            (NEDRY_GATE_TRIGGER_HOTSPOT_IDS.has(spot.id)
              ? 'Join our Discord'
              : toTitleCase(spot.id));
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'hotspot';
          if (
            OVERLAY_CONTROL_TO_OVERLAY_ID.has(spot.id) &&
            spot.id !== COMMODORE_OVERLAY_CONTROL_ID
          ) {
            el.classList.add('overlay-control-hotspot');
          }
          if (LOCKED_DEBUG_HOTSPOT_IDS.has(spot.id) || spot.locked) {
            el.classList.add('locked-debug-hotspot');
            LOCKED_DEBUG_HOTSPOT_IDS.add(spot.id);
          }
          el.id = spot.id;
          el.style.left = `${spot.x}px`;
          el.style.top = `${spot.y}px`;
          el.style.width = `${spot.w}px`;
          el.style.height = `${spot.h}px`;
          el.dataset.label = readableLabel;
          el.setAttribute('aria-label', readableLabel);
          el.title = readableLabel;

          const label = document.createElement('span');
          label.className = 'hotspot-label';
          label.textContent = `${readableLabel} (${spot.x}, ${spot.y}) ${spot.w}×${spot.h}`;
          el.appendChild(label);

          addResizeHandles(el);

          el.addEventListener('click', () => {
            console.log(`[hotspot] ${spot.id}`);
            if (spot.id === NOAHS_ARCADE_HOTSPOT_ID) {
              window.location.assign(getHotspotEffectiveUrl(spot.id) || NOAHS_ARCADE_URL);
              return;
            }
            if (spot.id === 'chapel') {
              window.location.assign(getHotspotEffectiveUrl(spot.id) || CHAPEL_URL);
              return;
            }
            if (spot.id === COMMODORE_POWER_BUTTON_CONTROL_ID) {
              triggerCommodorePowerOnSequence();
              return;
            }
            if (spot.id === FLIP_CLOCK_OVERLAY_CONTROL_ID) {
              openClockApp();
              return;
            }
            if (spot.id === DISCORD_OVERLAY_CONTROL_ID) {
              if (!isBigTvMonitorInteractive()) {
                return;
              }
              const wasDvdScreensaverActive = bigTvDvdOverlayEl?.classList.contains('is-active');
              interruptBigTvDvdLoop();
              if (wasDvdScreensaverActive) {
                activateRightMonitorCornerScoreMode();
              }
              setLeftMonitorState(DEFAULT_LEFT_MONITOR_STATE);
              void enterBigTvFullscreen();
              return;
            }
            if (WHITEBOARD_HOTSPOT_IDS.has(spot.id)) {
              window.location.assign(getHotspotEffectiveUrl(spot.id) || WHITEBOARD_HOTSPOT_URLS[spot.id] || WHITEBOARD_HOTSPOT_URLS.whiteboard);
              return;
            }
            if (AQUARIUM_HOTSPOT_IDS.has(spot.id)) {
              playAquariumHotspotSequence();
              return;
            }
            if (NEDRY_GATE_TRIGGER_HOTSPOT_IDS.has(spot.id)) {
              if (!isRightMonitorInteractive()) {
                return;
              }
              activateBigTvPromptMode();
              return;
            }
            if (spot.id === PENCIL_SHARPENER_HOTSPOT_ID) {
              window.location.assign(getHotspotEffectiveUrl(spot.id) || NOTES_URL);
              return;
            }
          });

          el.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              el.click();
            }
          });

          hotspotLayer.appendChild(el);
        });
        refreshDebugObjectSelectOptions();
      }

      function createOverlays() {
        overlayElementsById.clear();
        leftMonitorSegmentButtonsByState.clear();
        aquariumOverlayEl = null;
        aquariumStaticOverlayEl = null;
        aquariumStaticVideoEl = null;
        bigTvDvdOverlayEl = null;
        bigTvDvdGifEl = null;
        isBigTvDvdLoopInterrupted = false;
        stopBigTvDvdAnimation();
        hasDvdPosition = false;
        dvdColorStepIndex = 0;
        isDvdCornerCountEnabled = false;
        rightMonitorCornerScoreOverlayEl = null;
        rightMonitorCornerScoreValueEl = null;
        rightMonitorScreenWindowEl = null;
        rightMonitorOverlayImageUrl = BIG_TV_RIGHT_MONITOR_OVERLAY_BLUE_IMAGE_URL;
        bigTvPromptOverlayEl = null;
        bigTvPromptSecretBoxEl = null;
        bigTvPromptSecretEl = null;
        bigTvPromptInputEl = null;
        bigTvPromptHiddenInputEl = null;
        bigTvPromptSubmitButtonEl = null;
        if (bigTvPromptSecretRevealTimeoutId) {
          window.clearTimeout(bigTvPromptSecretRevealTimeoutId);
          bigTvPromptSecretRevealTimeoutId = null;
        }
        hideBigTvPromptOverlay();
        bigTvToolsOverlayEl = null;
        bigTvToolsListEl = null;
        bigTvToolsHeaderActionButtonEl = null;
        bigTvToolsFooterEl = null;
        bigTvToolsHintEl = null;
        isBigTvToolsActive = false;
        bigTvToolsViewMode = 'menu';
        loginOverlayEl = null;
        isLoginActive = false;
        calendarBigTvOverlayEl = null;
        calendarMonthImageEl = null;
        isCalendarBigTvActive = false;
        rightMonitorStaticOverlayEl = null;
        rightMonitorStaticVideoEl = null;
        rightMonitorShrimpLogoOverlayEl = null;
        discordJoinButtonEl = null;
        discordButtonImgEl = null;
        leftMonitorStaticOverlayEl = null;
        leftMonitorStaticVideoEl = null;
        leftMonitorContentImageEl = null;
        commodorePowerButtonEl = null;
        isCommodorePoweringOn = loadCommodorePowerState();
        commodoreShadowOverlayEl = null;
        bigTvShadowOverlayEl = null;
        leftMonitorShadowOverlayEl = null;
        rightMonitorShadowOverlayEl = null;
        cancelMonitorPowerTimeouts();
        nedryGateOverlayEl = null;
        nedryGateVideoEl = null;
        if (flipClockRadioTuningAudioEl) {
          stopRadioTuningLoopPlayback(flipClockRadioTuningAudioEl);
        }
        overlayDefaults.forEach((overlay) => {
          const rect = getOverlayRect(overlay.id);
          if (!rect) return;

          const el = document.createElement('div');
          let monitorScreenWindowEl = null;
          el.id = overlay.id;
          el.className = 'screen-overlay';
          el.style.left = `${rect.x}px`;
          el.style.top = `${rect.y}px`;
          el.style.width = `${rect.w}px`;
          el.style.height = `${rect.h}px`;

          if (overlay.id === DISCORD_OVERLAY_ID) {
            el.classList.add('discord-widget-overlay', 'big-tv-fullscreen-target');
            bigTvDvdOverlayEl = document.createElement('div');
            bigTvDvdOverlayEl.className = 'discord-static-overlay big-tv-dvd-overlay is-active';
            bigTvDvdOverlayEl.setAttribute('aria-hidden', 'false');
            bigTvDvdOverlayEl.setAttribute('role', 'button');
            bigTvDvdOverlayEl.setAttribute('aria-label', 'Enable CornerCount on right monitor');
            bigTvDvdOverlayEl.tabIndex = 0;
            const toggleDvdCornerCount = () => {
              if (!isBigTvDefaultScreensaverActive() || !isRightMonitorInteractive()) {
                return;
              }
              isDvdCornerCountEnabled = !isDvdCornerCountEnabled;
              syncDvdScreensaverState();
            };
            bigTvDvdOverlayEl.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleDvdCornerCount();
            });
            bigTvDvdOverlayEl.addEventListener('keydown', (event) => {
              const isActivationKey =
                event.key === 'Enter' ||
                event.code === 'Space';
              if (!isActivationKey) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              toggleDvdCornerCount();
            });
            bigTvDvdGifEl = document.createElement('img');
            bigTvDvdGifEl.className = 'big-tv-dvd-gif';
            bigTvDvdGifEl.alt = 'DVD logo animation';
            bigTvDvdGifEl.src = BIG_TV_SCREENSAVER_GIF_URL;
            bigTvDvdGifEl.draggable = false;
            bigTvDvdGifEl.loading = 'eager';
            bigTvDvdGifEl.decoding = 'async';
            bigTvDvdOverlayEl.appendChild(bigTvDvdGifEl);
            el.appendChild(bigTvDvdOverlayEl);
            applyDvdColorStep();
            if (DISCORD_WIDGET_URL) {
              const widgetFrame = document.createElement('iframe');
              widgetFrame.className = 'discord-widget-frame';
              widgetFrame.src = DISCORD_WIDGET_URL;
              widgetFrame.title = 'Discord server widget';
              widgetFrame.setAttribute('allowtransparency', 'true');
              widgetFrame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
              el.appendChild(widgetFrame);
            }
            el.appendChild(createBigTvFullscreenExitButton());
          }

          if (overlay.id === AQUARIUM_OVERLAY_ID) {
            aquariumOverlayEl = el;
            el.classList.add('aquarium-video-overlay', 'big-tv-fullscreen-target');
            el.appendChild(createBigTvFullscreenExitButton());

            aquariumStaticOverlayEl = document.createElement('div');
            aquariumStaticOverlayEl.className = 'discord-static-overlay';
            aquariumStaticOverlayEl.setAttribute('aria-hidden', 'true');

            aquariumStaticVideoEl = document.createElement('video');
            aquariumStaticVideoEl.className = 'discord-static-video';
            aquariumStaticVideoEl.src = AQUARIUM_STATIC_VIDEO_URL;
            aquariumStaticVideoEl.preload = 'metadata';
            aquariumStaticVideoEl.muted = true;
            aquariumStaticVideoEl.defaultMuted = true;
            aquariumStaticVideoEl.playsInline = true;
            aquariumStaticVideoEl.setAttribute('playsinline', '');
            aquariumStaticVideoEl.setAttribute('webkit-playsinline', '');
            aquariumStaticOverlayEl.appendChild(aquariumStaticVideoEl);
            el.appendChild(aquariumStaticOverlayEl);

            bigTvPromptOverlayEl = document.createElement('div');
            bigTvPromptOverlayEl.className = 'big-tv-prompt-overlay';
            bigTvPromptOverlayEl.setAttribute('aria-hidden', 'true');
            bigTvPromptOverlayEl.addEventListener('pointerdown', (event) => {
              const targetNode = event.target;
              const tappedSecretBox =
                targetNode && bigTvPromptSecretBoxEl && bigTvPromptSecretBoxEl.contains(targetNode);
              if (
                bigTvPromptHiddenInputEl &&
                event.target !== bigTvPromptSubmitButtonEl &&
                !tappedSecretBox
              ) {
                bigTvPromptHiddenInputEl.focus();
              }
            });

            const promptContent = document.createElement('div');
            promptContent.className = 'big-tv-prompt-content';

            bigTvPromptSecretBoxEl = document.createElement('button');
            bigTvPromptSecretBoxEl.type = 'button';
            bigTvPromptSecretBoxEl.className = 'big-tv-prompt-secret-box';
            bigTvPromptSecretBoxEl.addEventListener('pointerenter', () => setBigTvPromptSecretRevealed(true));
            bigTvPromptSecretBoxEl.addEventListener('pointerleave', () => setBigTvPromptSecretRevealed(false));
            bigTvPromptSecretBoxEl.addEventListener('focus', () => setBigTvPromptSecretRevealed(true));
            bigTvPromptSecretBoxEl.addEventListener('blur', () => setBigTvPromptSecretRevealed(false));
            bigTvPromptSecretBoxEl.addEventListener('pointerdown', (event) => {
              if (event.pointerType !== 'mouse') {
                setBigTvPromptSecretRevealed(true, { temporary: true });
              }
            });
            bigTvPromptSecretBoxEl.addEventListener('click', (event) => {
              if (event.detail === 0) {
                setBigTvPromptSecretRevealed(true, { temporary: true });
              }
            });

            bigTvPromptSecretEl = document.createElement('p');
            bigTvPromptSecretEl.className = 'big-tv-prompt-secret';
            bigTvPromptSecretEl.textContent = BIG_TV_PROMPT_SECRET_TEXT;
            bigTvPromptSecretBoxEl.appendChild(bigTvPromptSecretEl);

            const promptLine = document.createElement('div');
            promptLine.className = 'big-tv-prompt-line';

            const promptPrefix = document.createElement('span');
            promptPrefix.textContent = BIG_TV_PROMPT_PREFIX;
            bigTvPromptInputEl = document.createElement('span');
            bigTvPromptInputEl.className = 'big-tv-prompt-input';
            const promptCaret = document.createElement('span');
            promptCaret.className = 'big-tv-prompt-caret';
            promptCaret.textContent = '_';
            promptLine.append(promptPrefix, bigTvPromptInputEl, promptCaret);

            bigTvPromptSubmitButtonEl = document.createElement('button');
            bigTvPromptSubmitButtonEl.type = 'button';
            bigTvPromptSubmitButtonEl.className = 'big-tv-prompt-submit';
            bigTvPromptSubmitButtonEl.textContent = 'Submit';
            bigTvPromptSubmitButtonEl.addEventListener('click', (event) => {
              event.preventDefault();
              submitBigTvPrompt();
            });

            promptContent.append(promptLine, bigTvPromptSubmitButtonEl);

            bigTvPromptHiddenInputEl = document.createElement('input');
            bigTvPromptHiddenInputEl.type = 'text';
            bigTvPromptHiddenInputEl.className = 'big-tv-prompt-hidden-input';
            bigTvPromptHiddenInputEl.setAttribute('aria-hidden', 'true');
            bigTvPromptHiddenInputEl.setAttribute('autocomplete', 'off');
            bigTvPromptHiddenInputEl.setAttribute('autocorrect', 'off');
            bigTvPromptHiddenInputEl.setAttribute('autocapitalize', 'off');
            bigTvPromptHiddenInputEl.setAttribute('spellcheck', 'false');
            bigTvPromptHiddenInputEl.addEventListener('input', () => {
              if (!isBigTvPromptActive) return;
              bigTvPromptInputValue = bigTvPromptHiddenInputEl.value;
              updateBigTvPromptInput();
            });
            bigTvPromptHiddenInputEl.addEventListener('keydown', (event) => {
              if (!isBigTvPromptActive) return;
              if (event.key === 'Enter') {
                event.preventDefault();
                submitBigTvPrompt();
              } else if (event.key === 'Escape') {
                hideBigTvPromptOverlay();
              }
            });
            bigTvPromptOverlayEl.appendChild(bigTvPromptHiddenInputEl);

            bigTvPromptOverlayEl.appendChild(bigTvPromptSecretBoxEl);
            bigTvPromptOverlayEl.appendChild(promptContent);
            el.appendChild(bigTvPromptOverlayEl);

            bigTvToolsOverlayEl = document.createElement('div');
            bigTvToolsOverlayEl.className = 'big-tv-tools-overlay';
            bigTvToolsOverlayEl.setAttribute('aria-hidden', 'true');
            bigTvToolsOverlayEl.addEventListener('pointerdown', (event) => event.stopPropagation());
            bigTvToolsOverlayEl.addEventListener('click', (event) => event.stopPropagation());

            const toolsHeader = document.createElement('div');
            toolsHeader.className = 'big-tv-tools-header';
            bigTvToolsHeaderActionButtonEl = document.createElement('button');
            bigTvToolsHeaderActionButtonEl.type = 'button';
            bigTvToolsHeaderActionButtonEl.className = 'big-tv-tools-header-action';
            bigTvToolsHeaderActionButtonEl.setAttribute('aria-label', 'Add tool');
            bigTvToolsHeaderActionButtonEl.textContent = '+';
            bigTvToolsHeaderActionButtonEl.addEventListener('pointerdown', (event) => event.stopPropagation());
            bigTvToolsHeaderActionButtonEl.addEventListener('click', (event) => {
              event.stopPropagation();
              if (bigTvToolsViewMode === 'editor') {
                showBigTvToolsMenu();
              } else {
                addBigTvToolEntry();
              }
            });
            const toolsLogo = document.createElement('img');
            toolsLogo.className = 'big-tv-tools-logo';
            toolsLogo.src = BIG_TV_TOOLS_LOGO_URL;
            toolsLogo.alt = 'Tools';
            toolsLogo.loading = 'lazy';
            toolsLogo.decoding = 'async';
            toolsHeader.append(bigTvToolsHeaderActionButtonEl, toolsLogo);

            bigTvToolsHintEl = document.createElement('p');
            bigTvToolsHintEl.className = 'big-tv-tools-hint';
            bigTvToolsHintEl.textContent = 'Press + to add a tool.';
            toolsHeader.append(bigTvToolsHintEl);

            bigTvToolsListEl = document.createElement('div');
            bigTvToolsListEl.className = 'big-tv-tools-list';

            bigTvToolsFooterEl = document.createElement('div');
            bigTvToolsFooterEl.className = 'big-tv-tools-footer is-hidden';
            const toolsAddButton = document.createElement('button');
            toolsAddButton.type = 'button';
            toolsAddButton.className = 'big-tv-tools-add-button';
            toolsAddButton.setAttribute('aria-label', 'Add tool');
            toolsAddButton.textContent = '+';
            toolsAddButton.addEventListener('pointerdown', (event) => event.stopPropagation());
            toolsAddButton.addEventListener('click', (event) => {
              event.stopPropagation();
              addBigTvToolEntry();
            });
            bigTvToolsFooterEl.appendChild(toolsAddButton);

            bigTvToolsOverlayEl.append(toolsHeader, bigTvToolsListEl, bigTvToolsFooterEl);
            renderBigTvToolsEntries();
            el.appendChild(bigTvToolsOverlayEl);

            // Login overlay
            loginOverlayEl = document.createElement('div');
            loginOverlayEl.className = 'login-overlay';
            loginOverlayEl.setAttribute('aria-hidden', 'true');
            loginOverlayEl.addEventListener('pointerdown', (event) => event.stopPropagation());
            loginOverlayEl.addEventListener('click', (event) => event.stopPropagation());

            const loginHeader = document.createElement('div');
            loginHeader.className = 'login-header';
            const loginLogo = document.createElement('img');
            loginLogo.className = 'login-logo';
            loginLogo.src = LOGIN_LOGO_URL;
            loginLogo.alt = 'Login';
            loginLogo.loading = 'lazy';
            loginLogo.decoding = 'async';
            loginHeader.appendChild(loginLogo);

            const loginBody = document.createElement('div');
            loginBody.className = 'login-body';

            const loginStatusPanel = document.createElement('div');
            loginStatusPanel.className = 'login-status-panel';

            loginStatusBadgeEl = document.createElement('div');
            loginStatusBadgeEl.className = 'login-status-badge';

            loginTitleEl = document.createElement('h2');
            loginTitleEl.className = 'login-title';

            loginMessageEl = document.createElement('p');
            loginMessageEl.className = 'login-message';

            const loginStepsEl = document.createElement('ol');
            loginStepsEl.className = 'login-steps';
            loginStepElsByKey.clear();
            [
              ['display', 'Display the login screen'],
              ['oauth', 'Open Discord OAuth'],
              ['return', 'Return with Discord account details']
            ].forEach(([key, label], index) => {
              const stepEl = document.createElement('li');
              stepEl.className = 'login-step is-pending';
              const indicatorEl = document.createElement('span');
              indicatorEl.className = 'login-step-indicator';
              indicatorEl.textContent = String(index + 1);
              const labelEl = document.createElement('span');
              labelEl.className = 'login-step-label';
              labelEl.textContent = label;
              stepEl.append(indicatorEl, labelEl);
              loginStepElsByKey.set(key, stepEl);
              loginStepsEl.appendChild(stepEl);
            });

            loginStatusPanel.append(loginStatusBadgeEl, loginTitleEl, loginMessageEl, loginStepsEl);

            const loginActionsEl = document.createElement('div');
            loginActionsEl.className = 'login-actions';

            loginPrimaryActionButtonEl = document.createElement('button');
            loginPrimaryActionButtonEl.type = 'button';
            loginPrimaryActionButtonEl.className = 'login-submit';
            loginPrimaryActionButtonEl.addEventListener('pointerdown', (event) => event.stopPropagation());
            loginPrimaryActionButtonEl.addEventListener('click', (event) => {
              event.stopPropagation();
              void handleLoginPrimaryAction();
            });
            loginActionsEl.appendChild(loginPrimaryActionButtonEl);

            loginAuthCardEl = document.createElement('div');
            loginAuthCardEl.className = 'login-auth-card is-hidden';

            loginAuthAvatarEl = document.createElement('img');
            loginAuthAvatarEl.className = 'login-auth-avatar';
            loginAuthAvatarEl.alt = 'Discord avatar';
            loginAuthAvatarEl.loading = 'lazy';
            loginAuthAvatarEl.decoding = 'async';

            const loginAuthGridEl = document.createElement('div');
            loginAuthGridEl.className = 'login-auth-grid';

            const createLoginAuthField = (labelText) => {
              const fieldEl = document.createElement('div');
              fieldEl.className = 'login-auth-field';
              const labelEl = document.createElement('div');
              labelEl.className = 'login-auth-label';
              labelEl.textContent = labelText;
              const valueEl = document.createElement('div');
              valueEl.className = 'login-auth-value';
              fieldEl.append(labelEl, valueEl);
              loginAuthGridEl.appendChild(fieldEl);
              return valueEl;
            };

            loginAuthUsernameValueEl = createLoginAuthField('Username');
            loginAuthUserIdValueEl = createLoginAuthField('User ID');
            loginAuthMembershipValueEl = createLoginAuthField('Membership');
            loginAuthAccessValueEl = createLoginAuthField('Access');

            loginAuthCardEl.append(loginAuthAvatarEl, loginAuthGridEl);

            loginBody.append(loginStatusPanel, loginActionsEl, loginAuthCardEl);
            loginOverlayEl.append(loginHeader, loginBody);
            el.appendChild(loginOverlayEl);
            syncLoginOverlayUi();

            // Calendar live-preview overlay
            calendarBigTvOverlayEl = document.createElement('button');
            calendarBigTvOverlayEl.type = 'button';
            calendarBigTvOverlayEl.className = 'calendar-big-tv-overlay';
            calendarBigTvOverlayEl.setAttribute('aria-hidden', 'true');
            calendarBigTvOverlayEl.setAttribute('aria-label', 'Calendar month preview');
            calendarBigTvOverlayEl.title = 'Calendar month preview';
            calendarBigTvOverlayEl.addEventListener('pointerdown', (event) => event.stopPropagation());
            calendarBigTvOverlayEl.addEventListener('click', (event) => event.stopPropagation());
            calendarMonthImageEl = document.createElement('img');
            calendarMonthImageEl.className = 'calendar-big-tv-image';
            calendarMonthImageEl.alt = 'Current calendar month';
            calendarMonthImageEl.loading = 'lazy';
            calendarMonthImageEl.decoding = 'async';
            calendarMonthImageEl.setAttribute('aria-hidden', 'true');
            calendarBigTvOverlayEl.appendChild(calendarMonthImageEl);
            el.appendChild(calendarBigTvOverlayEl);


            nedryGateOverlayEl = document.createElement('div');
            nedryGateOverlayEl.className = 'nedry-gate-overlay';
            nedryGateOverlayEl.setAttribute('aria-hidden', 'true');

            nedryGateVideoEl = document.createElement('video');
            nedryGateVideoEl.className = 'nedry-gate-video';
            nedryGateVideoEl.src = NEDRY_GATE_VIDEO_URL;
            nedryGateVideoEl.preload = 'metadata';
            nedryGateVideoEl.playsInline = true;
            nedryGateVideoEl.setAttribute('playsinline', '');
            nedryGateVideoEl.setAttribute('webkit-playsinline', '');
            nedryGateVideoEl.addEventListener('ended', () => hideNedryGateOverlay());
            nedryGateVideoEl.addEventListener('error', () => hideNedryGateOverlay());
            nedryGateVideoEl.addEventListener('loadedmetadata', () => updateBigTvDebugWatermarkPlacement());
            nedryGateOverlayEl.appendChild(nedryGateVideoEl);
            bigTvDebugWatermarkEl = document.createElement('div');
            bigTvDebugWatermarkEl.className = 'big-tv-debug-watermark';
            bigTvDebugWatermarkEl.setAttribute('aria-hidden', 'true');
            syncBigTvDebugWatermark();
            nedryGateOverlayEl.appendChild(bigTvDebugWatermarkEl);
            el.appendChild(nedryGateOverlayEl);
          }

          if (BIG_TV_FULLSCREEN_OVERLAY_IDS.has(overlay.id)) {
            el.addEventListener('click', (event) => {
              if (!isBigTvMonitorInteractive()) {
                return;
              }
              const clickedInteractiveBigTvUi =
                event.target instanceof Element &&
                event.target.closest(BIG_TV_INTERACTIVE_UI_SELECTORS);
              if (clickedInteractiveBigTvUi) {
                return;
              }
              if (overlay.id === AQUARIUM_OVERLAY_ID && document.fullscreenElement === el) {
                if (isBigTvToolsActive || skipAquariumToNextClip()) {
                  return;
                }
              }
              void enterBigTvFullscreen(el);
            });
          }

          if (overlay.id === 'overlay-left-monitor') {
            el.classList.add('calendar-monitor-overlay');
            monitorScreenWindowEl = document.createElement('div');
            monitorScreenWindowEl.className = 'monitor-screen-window left-monitor-screen-window';
            el.appendChild(monitorScreenWindowEl);
            leftMonitorContentImageEl = document.createElement('img');
            leftMonitorContentImageEl.className = 'left-monitor-content-image';
            leftMonitorContentImageEl.alt = '';
            leftMonitorContentImageEl.loading = 'lazy';
            leftMonitorContentImageEl.decoding = 'async';
            monitorScreenWindowEl.appendChild(leftMonitorContentImageEl);
            const selector = document.createElement('div');
            selector.className = 'left-monitor-selector';
            LEFT_MONITOR_SEGMENTS.forEach(({ state, label, quadrant }) => {
              const segment = document.createElement('button');
              segment.type = 'button';
              segment.className = 'left-monitor-segment';
              segment.dataset.quadrant = quadrant;
              segment.setAttribute('aria-label', `Toggle ${label} (${quadrant}) on left monitor`);
              segment.setAttribute('aria-pressed', 'false');
              segment.addEventListener('pointerdown', (event) => event.stopPropagation());
              segment.addEventListener('click', (event) => {
                event.stopPropagation();
                if (!isLeftMonitorInteractive()) {
                  return;
                }
                interruptAquariumPlaybackSequence();
                const nextState = state === leftMonitorSelectedState
                  ? DEFAULT_LEFT_MONITOR_STATE
                  : state;
                shouldAutoStartDiscordLoginOnNextLoginActivation =
                  nextState === 'login' && !discordAuthState?.authenticated;
                setLeftMonitorState(nextState);
              });
              leftMonitorSegmentButtonsByState.set(state, segment);
              selector.appendChild(segment);
            });
            monitorScreenWindowEl.appendChild(selector);
            setLeftMonitorState(leftMonitorSelectedState);

            leftMonitorStaticOverlayEl = document.createElement('div');
            leftMonitorStaticOverlayEl.className = 'overlay-static-layer';
            leftMonitorStaticOverlayEl.setAttribute('aria-hidden', 'true');
            leftMonitorStaticVideoEl = document.createElement('video');
            leftMonitorStaticVideoEl.className = 'overlay-static-video';
            leftMonitorStaticVideoEl.src = AQUARIUM_STATIC_VIDEO_URL;
            leftMonitorStaticVideoEl.preload = 'metadata';
            leftMonitorStaticVideoEl.muted = true;
            leftMonitorStaticVideoEl.defaultMuted = true;
            leftMonitorStaticVideoEl.loop = true;
            leftMonitorStaticVideoEl.playsInline = true;
            leftMonitorStaticVideoEl.setAttribute('playsinline', '');
            leftMonitorStaticVideoEl.setAttribute('webkit-playsinline', '');
            leftMonitorStaticOverlayEl.appendChild(leftMonitorStaticVideoEl);
            monitorScreenWindowEl.appendChild(leftMonitorStaticOverlayEl);
          }

          if (overlay.id === 'overlay-commodore-screen') {
            el.classList.add('commodore-desk-overlay');
            const img = document.createElement('img');
            img.className = 'commodore-desk-image';
            img.src = COMMODORE_DESK_IMAGE_URL;
            img.alt = 'Commodore desk screen';
            img.loading = 'lazy';
            img.decoding = 'async';
            el.appendChild(img);
          }

          if (overlay.id === COMMODORE_SHADOW_OVERLAY_ID) {
            el.classList.add('commodore-shadow-overlay');
            commodoreShadowOverlayEl = el;
          }

          if (
            overlay.id === BIG_TV_SHADOW_LAYER_ID ||
            overlay.id === LEFT_MONITOR_SHADOW_LAYER_ID ||
            overlay.id === RIGHT_MONITOR_SHADOW_LAYER_ID
          ) {
            el.classList.add('monitor-shadow-overlay');
            if (overlay.id === BIG_TV_SHADOW_LAYER_ID) bigTvShadowOverlayEl = el;
            else if (overlay.id === LEFT_MONITOR_SHADOW_LAYER_ID) leftMonitorShadowOverlayEl = el;
            else rightMonitorShadowOverlayEl = el;
          }

          if (overlay.id === COMMODORE_POWER_BUTTON_OVERLAY_ID) {
            el.classList.add('commodore-power-button-overlay');
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'commodore-power-button-button';
            button.classList.toggle('on', isCommodorePoweringOn);
            button.setAttribute('aria-label', 'Commodore power button');
            button.title = 'Commodore power button';
            button.addEventListener('pointerdown', (event) => event.stopPropagation());
            button.addEventListener('click', (event) => {
              event.stopPropagation();
              triggerCommodorePowerOnSequence();
            });
            commodorePowerButtonEl = button;
            el.appendChild(button);
          }

          if (overlay.id === 'overlay-right-monitor') {
            el.classList.add('join-discord-overlay');
            monitorScreenWindowEl = document.createElement('div');
            monitorScreenWindowEl.className = 'monitor-screen-window right-monitor-screen-window';
            el.appendChild(monitorScreenWindowEl);
            rightMonitorScreenWindowEl = monitorScreenWindowEl;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'join-discord-button';
            button.setAttribute('aria-label', 'Join our Discord');
            button.title = 'Join our Discord';
            button.addEventListener('pointerdown', (event) => event.stopPropagation());
            button.addEventListener('click', (event) => {
              event.stopPropagation();
              if (!isRightMonitorInteractive()) {
                return;
              }
              if (discordAuthState && discordAuthState.authenticated) {
                if (!discordAuthState.isMember) {
                  window.location.assign(DISCORD_GUEST_INVITE_URL);
                }
              } else {
                window.location.assign('/api/discord/auth');
              }
            });
            discordJoinButtonEl = button;

            const img = document.createElement('img');
            img.className = 'join-discord-button-image';
            img.src = rightMonitorOverlayImageUrl;
            img.alt = '';
            img.loading = 'lazy';
            img.decoding = 'async';
            discordButtonImgEl = img;
            button.appendChild(img);
            monitorScreenWindowEl.appendChild(button);

            rightMonitorCornerScoreOverlayEl = document.createElement('div');
            rightMonitorCornerScoreOverlayEl.className = 'right-monitor-corner-score-overlay';
            rightMonitorCornerScoreOverlayEl.setAttribute('aria-hidden', 'true');
            const cornerScoreLabelEl = document.createElement('p');
            cornerScoreLabelEl.className = 'right-monitor-corner-score-label';
            cornerScoreLabelEl.textContent = 'CornerScore';
            const cornerScoreValueEl = document.createElement('p');
            cornerScoreValueEl.className = 'right-monitor-corner-score-value';
            rightMonitorCornerScoreValueEl = cornerScoreValueEl;
            renderCornerScore();
            rightMonitorCornerScoreOverlayEl.append(cornerScoreLabelEl, cornerScoreValueEl);
            monitorScreenWindowEl.appendChild(rightMonitorCornerScoreOverlayEl);
            applyDvdColorStep();

            rightMonitorStaticOverlayEl = document.createElement('div');
            rightMonitorStaticOverlayEl.className = 'overlay-static-layer';
            rightMonitorStaticOverlayEl.setAttribute('aria-hidden', 'true');
            rightMonitorStaticVideoEl = document.createElement('video');
            rightMonitorStaticVideoEl.className = 'overlay-static-video';
            rightMonitorStaticVideoEl.src = AQUARIUM_STATIC_VIDEO_URL;
            rightMonitorStaticVideoEl.preload = 'metadata';
            rightMonitorStaticVideoEl.muted = true;
            rightMonitorStaticVideoEl.defaultMuted = true;
            rightMonitorStaticVideoEl.loop = true;
            rightMonitorStaticVideoEl.playsInline = true;
            rightMonitorStaticVideoEl.setAttribute('playsinline', '');
            rightMonitorStaticVideoEl.setAttribute('webkit-playsinline', '');
            rightMonitorStaticOverlayEl.appendChild(rightMonitorStaticVideoEl);
            monitorScreenWindowEl.appendChild(rightMonitorStaticOverlayEl);

            rightMonitorShrimpLogoOverlayEl = document.createElement('div');
            rightMonitorShrimpLogoOverlayEl.className = 'right-monitor-shrimp-logo-overlay';
            rightMonitorShrimpLogoOverlayEl.setAttribute('aria-hidden', 'true');
            const shrimpLogoImg = document.createElement('img');
            shrimpLogoImg.className = 'right-monitor-shrimp-logo-image';
            shrimpLogoImg.src = STARSHRIMP_LOGO_IMAGE_URL;
            shrimpLogoImg.alt = '';
            shrimpLogoImg.loading = 'eager';
            shrimpLogoImg.decoding = 'async';
            rightMonitorShrimpLogoOverlayEl.appendChild(shrimpLogoImg);
            monitorScreenWindowEl.appendChild(rightMonitorShrimpLogoOverlayEl);
          }

          if (overlay.id === LEFT_MONITOR_SIDE_FRAME_OVERLAY_ID || overlay.id === RIGHT_MONITOR_SIDE_FRAME_OVERLAY_ID) {
            el.classList.add('monitor-side-frame-overlay');
            const img = document.createElement('img');
            img.className = 'monitor-side-frame-image';
            img.src =
              overlay.id === LEFT_MONITOR_SIDE_FRAME_OVERLAY_ID
                ? LEFT_MONITOR_SIDE_FRAME_IMAGE_URL
                : RIGHT_MONITOR_SIDE_FRAME_IMAGE_URL;
            img.alt = '';
            img.loading = 'lazy';
            img.decoding = 'async';
            el.appendChild(img);
          }

          if (overlay.id === FLIP_CLOCK_OVERLAY_ID) {
            el.classList.add('flip-clock-overlay');
            el.addEventListener('pointerdown', (event) => event.stopPropagation());
            el.addEventListener('click', (event) => event.stopPropagation());

            function makeZone(className, ariaLabel, onActivate) {
              const zone = document.createElement('button');
              zone.type = 'button';
              zone.className = `rc-zone ${className}`;
              zone.setAttribute('aria-label', ariaLabel);
              zone.addEventListener('pointerdown', (e) => e.stopPropagation());
              zone.addEventListener('click', (e) => {
                e.stopPropagation();
                onActivate();
              });
              return zone;
            }

            const top = document.createElement('div');
            top.className = 'rc-top';

            const sleepKnob = document.createElement('div');
            sleepKnob.className = 'rc-knob';
            sleepKnob.setAttribute('aria-hidden', 'true');

            const speaker = document.createElement('div');
            speaker.className = 'rc-speaker';
            speaker.setAttribute('aria-hidden', 'true');

            const tunerKnob = document.createElement('div');
            tunerKnob.className = 'rc-knob';
            tunerKnob.setAttribute('aria-hidden', 'true');

            top.append(sleepKnob, speaker, tunerKnob);

            const face = document.createElement('div');
            face.className = 'rc-face';

            const clockZone = makeZone('rc-clock-zone', 'Open Clock App', openClockApp);
            const clockDigits = document.createElement('div');
            clockDigits.className = 'fc-digits';
            const h1 = createFlipCard(false); h1.dataset.key = 'h1';
            const h2 = createFlipCard(false); h2.dataset.key = 'h2';
            const timeGap = document.createElement('span');
            timeGap.className = 'rc-time-gap';
            timeGap.setAttribute('aria-hidden', 'true');
            const m1 = createFlipCard(false); m1.dataset.key = 'm1';
            const m2 = createFlipCard(false); m2.dataset.key = 'm2';
            clockDigits.append(h1, h2, timeGap, m1, m2);
            clockZone.append(clockDigits);

            const radioZone = makeZone('rc-radio-zone', 'Open Calendar App', openCalendarApp);

            const model = document.createElement('div');
            model.className = 'rc-model';
            model.textContent = 'FM/AM';

            const dateBadge = document.createElement('div');
            dateBadge.className = 'rc-date-badge';
            dateBadge.dataset.key = 'date-badge';
            dateBadge.textContent = 'JAN 01';

            const scaleBlock = document.createElement('div');
            scaleBlock.className = 'rc-scale-block';

            const selectorLine = document.createElement('div');
            selectorLine.className = 'rc-selector-line';
            selectorLine.setAttribute('aria-hidden', 'true');
            let tuningPosition = applyRadioTuningPosition(scaleBlock, 0.84);
            let tuningAudio = flipClockRadioTuningAudioEl || getRadioTuningAudioElement(getNextRadioTuningAudioUrl());
            flipClockRadioTuningAudioEl = tuningAudio;
            resetRadioTuningPlayback(tuningAudio);
            const TUNING_DRAG_THRESHOLD_PX = 1;
            const KEYBOARD_TUNING_STEP = 0.02;
            const KEYBOARD_AUDIO_STOP_DELAY_MS = 120;
            let activeTunePointerId = null;
            let lastPointerClientX = 0;
            let stopTuneAudioTimeoutId = null;

            const selectorDot = document.createElement('div');
            selectorDot.className = 'rc-selector-dot';
            selectorDot.setAttribute('role', 'slider');
            selectorDot.setAttribute('tabindex', '0');
            selectorDot.setAttribute('aria-label', 'Tune radio frequency');
            selectorDot.setAttribute('aria-valuemin', '0');
            selectorDot.setAttribute('aria-valuemax', '100');
            selectorDot.setAttribute('aria-valuenow', String(Math.round(tuningPosition * 100)));

            function updateTuningFromClientX(clientX, { playAudio = true, timestampMs } = {}) {
              const rect = scaleBlock.getBoundingClientRect();
              if (!rect.width) return false;
              const nextPosition = clamp((clientX - rect.left) / rect.width, 0, 1);
              if (Math.abs(nextPosition - tuningPosition) < 0.001) return false;
              tuningPosition = applyRadioTuningPosition(scaleBlock, nextPosition);
              selectorDot.setAttribute('aria-valuenow', String(Math.round(tuningPosition * 100)));
              resetRadioTuningPlayback(tuningAudio);
              if (playAudio) {
                ensureRadioTuningLoopPlayback(tuningAudio);
              }
              return true;
            }

            function endTuneDrag(pointerId) {
              if (activeTunePointerId !== pointerId) return;
              activeTunePointerId = null;
              stopRadioTuningLoopPlayback(tuningAudio);
              if (selectorDot.hasPointerCapture(pointerId)) {
                selectorDot.releasePointerCapture(pointerId);
              }
            }

            function selectNextTuningAudio() {
              const nextAudio = getRadioTuningAudioElement(getNextRadioTuningAudioUrl());
              if (tuningAudio && tuningAudio !== nextAudio) {
                stopRadioTuningLoopPlayback(tuningAudio);
              }
              tuningAudio = nextAudio;
              flipClockRadioTuningAudioEl = tuningAudio;
              resetRadioTuningPlayback(tuningAudio);
            }

            selectorDot.addEventListener('pointerdown', (event) => {
              event.preventDefault();
              event.stopPropagation();
              activeTunePointerId = event.pointerId;
              lastPointerClientX = event.clientX;
              selectorDot.setPointerCapture(event.pointerId);
              selectNextTuningAudio();
              const didUpdateTuning = updateTuningFromClientX(event.clientX, { playAudio: true, timestampMs: event.timeStamp });
              if (!didUpdateTuning) {
                resetRadioTuningPlayback(tuningAudio);
                ensureRadioTuningLoopPlayback(tuningAudio);
              }
            });

            selectorDot.addEventListener('pointermove', (event) => {
              if (event.pointerId !== activeTunePointerId) return;
              event.preventDefault();
              event.stopPropagation();
              const didMove = updateTuningFromClientX(event.clientX, { playAudio: true, timestampMs: event.timeStamp });
              if (!didMove && Math.abs(event.clientX - lastPointerClientX) > TUNING_DRAG_THRESHOLD_PX) {
                ensureRadioTuningLoopPlayback(tuningAudio);
              }
              lastPointerClientX = event.clientX;
            });

            selectorDot.addEventListener('pointerup', (event) => {
              event.preventDefault();
              event.stopPropagation();
              endTuneDrag(event.pointerId);
            });
            selectorDot.addEventListener('pointercancel', (event) => {
              event.preventDefault();
              event.stopPropagation();
              endTuneDrag(event.pointerId);
            });
            selectorDot.addEventListener('lostpointercapture', () => {
              activeTunePointerId = null;
              stopRadioTuningLoopPlayback(tuningAudio);
            });
            selectorDot.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
            });
            selectorDot.addEventListener('keydown', (event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
              event.preventDefault();
              event.stopPropagation();
              const step = event.key === 'ArrowRight' ? KEYBOARD_TUNING_STEP : -KEYBOARD_TUNING_STEP;
              tuningPosition = applyRadioTuningPosition(scaleBlock, tuningPosition + step);
              selectorDot.setAttribute('aria-valuenow', String(Math.round(tuningPosition * 100)));
              resetRadioTuningPlayback(tuningAudio);
              ensureRadioTuningLoopPlayback(tuningAudio);
              if (stopTuneAudioTimeoutId !== null) {
                window.clearTimeout(stopTuneAudioTimeoutId);
              }
              stopTuneAudioTimeoutId = window.setTimeout(() => {
                stopTuneAudioTimeoutId = null;
                stopRadioTuningLoopPlayback(tuningAudio);
              }, KEYBOARD_AUDIO_STOP_DELAY_MS);
            });

            const fmRow = document.createElement('div');
            fmRow.className = 'rc-scale-row';
            fmRow.innerHTML = `
              <span class="rc-band">FM</span>
              <span class="rc-frequencies">
                <span>88</span><span>92</span><span>96</span><span>100</span><span>104</span><span>108</span>
              </span>
              <span class="rc-unit">MHz</span>
            `;

            const amRow = document.createElement('div');
            amRow.className = 'rc-scale-row';
            amRow.innerHTML = `
              <span class="rc-band">AM</span>
              <span class="rc-frequencies">
                <span>53</span><span>60</span><span>70</span><span>90</span><span>120</span><span>160</span>
              </span>
              <span class="rc-unit">kHz</span>
            `;

            const selectorLabel = document.createElement('div');
            selectorLabel.className = 'rc-selector-label';
            selectorLabel.textContent = 'Tuning';

            const brand = document.createElement('div');
            brand.className = 'rc-brand';
            brand.textContent = 'Panasonic';

            scaleBlock.append(selectorLine, selectorDot, fmRow, amRow);
            radioZone.append(model, dateBadge, scaleBlock, selectorLabel, brand);

            face.append(clockZone, radioZone);
            el.append(top, face);

            // Start the live clock after the element is in the DOM
            requestAnimationFrame(() => startFlipClock(el));
          }

          screenOverlayLayer.appendChild(el);
          overlayElementsById.set(overlay.id, el);
        });
        syncDiscordButtonUi();
      }

      function applyTransforms() {
        world.style.transform = `translate3d(${-cameraX}px, 0, 0)`;
      }

      function setCameraX(nextCameraX) {
        cameraX = clamp(nextCameraX, 0, maxCameraX);
        applyTransforms();
      }

      function setTargetCameraX(nextCameraX) {
        const nextTarget = clamp(nextCameraX, 0, maxCameraX);
        if (targetCameraX === nextTarget) return;
        targetCameraX = nextTarget;
        startCameraAnimation();
      }

      function startCameraAnimation() {
        if (cameraAnimationFrameId !== null) return;
        cameraAnimationFrameId = window.requestAnimationFrame(tickCamera);
      }

      function tickCamera() {
        cameraAnimationFrameId = null;
        const delta = targetCameraX - cameraX;
        if (Math.abs(delta) < CAMERA_SETTLE_EPSILON) {
          setCameraX(targetCameraX);
          return;
        }
        setCameraX(cameraX + delta * CAMERA_SMOOTHING_FACTOR);
        startCameraAnimation();
      }

      function startMomentum(initialVelocityX) {
        stopMomentum();
        if (!shouldUseMomentum(activePointerType) || Math.abs(initialVelocityX) < TOUCH_MOMENTUM_MIN_VELOCITY) {
          return;
        }

        setCameraX(targetCameraX);
        targetCameraX = cameraX;
        momentumVelocityX = initialVelocityX;
        momentumAnimationFrameId = window.requestAnimationFrame(function tickMomentum(timestamp) {
          if (lastMomentumTimestamp === 0) {
            lastMomentumTimestamp = timestamp;
          }

          const elapsed = Math.max(1, timestamp - lastMomentumTimestamp);
          lastMomentumTimestamp = timestamp;
          momentumVelocityX *= Math.exp(-TOUCH_MOMENTUM_DECAY * elapsed);

          if (Math.abs(momentumVelocityX) < TOUCH_MOMENTUM_MIN_VELOCITY) {
            stopMomentum();
            return;
          }

          const previousCameraX = cameraX;
          setCameraX(cameraX + momentumVelocityX * elapsed);
          targetCameraX = cameraX;

          if (cameraX === previousCameraX) {
            stopMomentum();
            return;
          }

          momentumAnimationFrameId = window.requestAnimationFrame(tickMomentum);
        });
      }

      function resize() {
        scale = window.innerHeight / DESIGN_HEIGHT;
        visibleWidth = window.innerWidth / scale;
        maxCameraX = Math.max(0, worldWidth - visibleWidth);

        stage.style.width = `${worldWidth}px`;
        stage.style.transform = `scale(${scale}) translate3d(0, -50%, 0)`;
        world.style.width = `${worldWidth}px`;
        world.style.height = `${worldHeight}px`;

        // Start camera centered on the desk area in tile 0.
        if (!hasInitializedCamera) {
          setCameraX(DESK_CENTER_X - visibleWidth / 2);
          targetCameraX = cameraX;
          hasInitializedCamera = true;
        } else {
          setCameraX(cameraX);
          targetCameraX = cameraX;
        }
        updateBigTvDebugWatermarkPlacement();
      }

      function onWheel(event) {
        event.preventDefault();
        stopMomentum();
        let unitScale = 1;
        if (event.deltaMode === DOM_DELTA_LINE) {
          unitScale = LINE_SCROLL_PIXELS;
        } else if (event.deltaMode === DOM_DELTA_PAGE) {
          unitScale = window.innerHeight;
        }
        // Map both vertical wheel and horizontal trackpad movement into horizontal camera travel.
        const useHorizontalAxis = Math.abs(event.deltaX) > Math.abs(event.deltaY);
        const primaryAxisDelta = useHorizontalAxis ? event.deltaX : event.deltaY;
        setTargetCameraX(targetCameraX + primaryAxisDelta * unitScale * WHEEL_SCROLL_MULTIPLIER);
      }

      function startDebugEdit(event, el, type, dir) {
        if (el.classList.contains('locked-debug-hotspot')) return;
        activePointerId = event.pointerId;
        debugEditType = type;
        debugEditEl = el;
        debugEditDir = dir;
        debugEditStartX = event.clientX;
        debugEditStartY = event.clientY;
        debugEditOrigRect = {
          left: parseFloat(el.style.left),
          top: parseFloat(el.style.top),
          w: parseFloat(el.style.width),
          h: parseFloat(el.style.height)
        };
        viewport.setPointerCapture(event.pointerId);
      }

      function applyDebugEdit(event) {
        const dx = (event.clientX - debugEditStartX) / scale;
        const dy = (event.clientY - debugEditStartY) / scale;
        const { left, top, w, h } = debugEditOrigRect;
        const el = debugEditEl;
        const MIN_SIZE = 20;

        if (debugEditType === 'move') {
          el.style.left = `${left + dx}px`;
          el.style.top = `${top + dy}px`;
        } else {
          const dir = debugEditDir;
          let newLeft = left;
          let newTop = top;
          let newW = w;
          let newH = h;

          if (dir.includes('e')) newW = Math.max(MIN_SIZE, w + dx);
          if (dir.includes('w')) {
            const clampedW = Math.max(MIN_SIZE, w - dx);
            newLeft = left + (w - clampedW);
            newW = clampedW;
          }
          if (dir.includes('s')) newH = Math.max(MIN_SIZE, h + dy);
          if (dir.includes('n')) {
            const clampedH = Math.max(MIN_SIZE, h - dy);
            newTop = top + (h - clampedH);
            newH = clampedH;
          }

          el.style.left   = `${newLeft}px`;
          el.style.top    = `${newTop}px`;
          el.style.width  = `${newW}px`;
          el.style.height = `${newH}px`;
        }

        updateHotspotLabel(el);
        if (OVERLAY_CONTROL_TO_OVERLAY_ID.has(el.id)) {
          syncControlledOverlaysFromHotspots();
        }
      }

      function onPointerDown(event) {
        if (activePointerId !== null) return;
        stopMomentum();

        // In debug mode, intercept drags on hotspots and resize handles.
        if (document.body.classList.contains('debug')) {
          const handle = event.target.closest('.resize-handle');
          if (handle) {
            const hotspotEl = handle.closest('.hotspot');
            if (hotspotEl && !hotspotEl.classList.contains('locked-debug-hotspot')) {
              startDebugEdit(event, hotspotEl, 'resize', handle.dataset.dir);
              return;
            }
          }
          const hotspotEl = event.target.closest('.hotspot');
          if (hotspotEl && !hotspotEl.classList.contains('locked-debug-hotspot')) {
            startDebugEdit(event, hotspotEl, 'move', null);
            return;
          }
        }

        isPointerDown = true;
        activePointerId = event.pointerId;
        activePointerType = event.pointerType || '';
        pointerStartX = event.clientX;
        lastPointerX = event.clientX;
        lastPointerMoveTime = event.timeStamp;
        dragVelocityX = 0;
        dragStartedOnHotspot = Boolean(event.target.closest('.hotspot'));
        suppressHotspotClickUntil = 0;
      }

      function onPointerMove(event) {
        if (event.pointerId !== activePointerId) return;

        // Debug edit in progress — move or resize the hotspot.
        if (debugEditType !== null) {
          applyDebugEdit(event);
          return;
        }

        if (!isPointerDown) return;

        if (!isDragging) {
          const dragDistance = Math.abs(event.clientX - pointerStartX);
          if (dragDistance < DRAG_START_THRESHOLD_PX) {
            return;
          }
          isDragging = true;
          viewport.classList.add('dragging');
          viewport.setPointerCapture(event.pointerId);
          if (dragStartedOnHotspot) {
            suppressHotspotClickUntil = Date.now() + HOTSPOT_CLICK_SUPPRESSION_MS;
          }
        }

        event.preventDefault();
        const dx = event.clientX - lastPointerX;
        const elapsed = Math.max(1, event.timeStamp - lastPointerMoveTime);
        lastPointerX = event.clientX;
        lastPointerMoveTime = event.timeStamp;

        // Convert screen drag delta to design-space world delta.
        const dragScrollMultiplier = shouldUseMomentum(activePointerType)
          ? MOBILE_DRAG_SCROLL_MULTIPLIER
          : DESKTOP_DRAG_SCROLL_MULTIPLIER;
        const worldDelta = (-dx / scale) * dragScrollMultiplier;
        dragVelocityX = dragVelocityX * 0.75 + (worldDelta / elapsed) * 0.25;
        setTargetCameraX(targetCameraX + worldDelta);
      }

      function onPointerUp(event) {
        if (event.pointerId !== activePointerId) return;

        // End a debug edit operation.
        if (debugEditType !== null) {
          suppressHotspotClickUntil = Date.now() + HOTSPOT_CLICK_SUPPRESSION_MS;
          debugEditType = null;
          debugEditEl = null;
          debugEditDir = null;
          debugEditOrigRect = null;
          activePointerId = null;
          activePointerType = '';
          if (viewport.hasPointerCapture(event.pointerId)) {
            viewport.releasePointerCapture(event.pointerId);
          }
          return;
        }

        const shouldStartMomentum = isDragging && shouldUseMomentum(activePointerType);
        const releasedVelocityX = dragVelocityX;
        isPointerDown = false;
        activePointerId = null;
        activePointerType = '';
        dragStartedOnHotspot = false;
        isDragging = false;
        dragVelocityX = 0;
        viewport.classList.remove('dragging');
        if (viewport.hasPointerCapture(event.pointerId)) {
          viewport.releasePointerCapture(event.pointerId);
        }
        if (shouldStartMomentum) {
          startMomentum(releasedVelocityX);
        }
      }

      function onKeyDown(event) {
        const debugComboPressed =
          event.code === 'KeyD' &&
          (event.ctrlKey || event.metaKey) &&
          event.shiftKey;

        if (event.code === 'Backquote' || debugComboPressed) {
          toggleDebugMode();
        }

        if (document.fullscreenElement === aquariumOverlayEl && !isBigTvToolsActive) {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            skipAquariumToPreviousClip();
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            skipAquariumToNextClip();
          }
        }
      }

      function setDebugMode(enabled) {
        document.body.classList.toggle('debug', enabled);
        if (enabled) {
          refreshDebugObjectSelectOptions();
        }
        refreshDebugObjectActions();
        debugStatus.textContent = enabled
          ? 'Debug mode enabled'
          : 'Debug mode disabled';
      }

      function toggleDebugMode() {
        setDebugMode(!document.body.classList.contains('debug'));
      }

      const WRONG_AUDIO_URL = 'assets/audio/wrong.v20260424.mp3';

      function onDebugButtonClick() {
        if (document.body.classList.contains('debug')) {
          setDebugMode(false);
          return;
        }
        const attempt = window.prompt('Password required.');
        if (attempt === null) {
          if (debugStatus) debugStatus.textContent = 'Debug cancelled.';
          return;
        }
        const isValid = hasMatchingDebugSaveCipher(encodeDebugSavePassword(attempt.trim()));
        if (!isValid) {
          if (debugStatus) debugStatus.textContent = 'Incorrect password.';
          const wrongAudio = new Audio(WRONG_AUDIO_URL);
          wrongAudio.play().catch((error) => {
            if (error?.name !== 'AbortError') {
              console.warn('Unable to play wrong audio.', error);
            }
          });
          return;
        }
        hasDebugSaveAccess = true;
        setDebugMode(true);
      }

      async function saveHotspots() {
        if (!ensureDebugSaveAccess()) {
          setSaveButtonText('Password required');
          resetSaveButtonSoon();
          return;
        }
        const savedRuntimeHotspots = getSavedHotspotsFromDom();
        const savedSourceHotspots = runtimeHotspotsToSource(savedRuntimeHotspots);
        hotspots = savedRuntimeHotspots;
        hideSaveModal();

        setSaveButtonText('Saving...', true);
        try {
          await postHotspotsToServer(savedSourceHotspots);
          persistSaveResultFlash('Hotspots saved to the server.');
          setDebugMode(false);
          window.location.reload();
        } catch (error) {
          setSaveButtonText('Save failed');
          debugStatus.textContent = 'Server save failed; hotspots were not persisted (server-only mode).';
          showSaveFallbackModal(
            savedSourceHotspots,
            `Unable to save to the server (${error.message}) — hotspots were not persisted (server-only mode); copy the code below to update source manually`
          );
          resetSaveButtonSoon();
        }
      }

      function cleanup() {
        hideBigTvPromptOverlay();
        stopBigTvDvdAnimation();
        if (cameraAnimationFrameId !== null) {
          window.cancelAnimationFrame(cameraAnimationFrameId);
          cameraAnimationFrameId = null;
        }
        if (flipClockAlignTimeoutId !== null) {
          clearTimeout(flipClockAlignTimeoutId);
          flipClockAlignTimeoutId = null;
        }
        if (flipClockIntervalId !== null) {
          clearInterval(flipClockIntervalId);
          flipClockIntervalId = null;
        }
        if (flipClockRadioTuningAudioEl) {
          stopRadioTuningLoopPlayback(flipClockRadioTuningAudioEl);
          flipClockRadioTuningAudioEl.currentTime = 0;
        }
        cancelMonitorPowerTimeouts();
        stopMomentum();
      }

      function renderHotspotLayers() {
        createAshtraySmokeEffect();
        createAshtrayCigaretteEffect();
        createHotspots(hotspots);
        syncControlledOverlaysFromHotspots();
      }

      function hydrateNonCriticalSceneData() {
        void loadAquariumShrimpClipCatalog();
        void loadCornerScoreFromServer();

        void fetchDiscordAuthState().then(() => {
          syncDiscordAuthBodyClass();
          syncDiscordButtonUi();
        });
      }

      function hydrateHotspotsFromServer({ hasSaveResultFlash = false } = {}) {
        void loadHotspotsFromServer().then((serverHotspots) => {
          const hasServerHotspots = serverHotspots !== null && serverHotspots !== undefined;
          if (hasServerHotspots) {
            hotspots = serverHotspots;
            renderHotspotLayers();
            resize();
          }

          if (!hasSaveResultFlash) {
            debugStatus.textContent = hasServerHotspots
              ? 'Hotspots loaded from the server.'
              : 'Server hotspots unavailable; loaded bundled default hotspots.';
          }
        });
      }

      function initializeScene() {
        const restoredDiscordLoginFlowState = consumeDiscordLoginFlowState();
        const saveResultFlash = consumeSaveResultFlash();
        hotspots = sourceHotspotsToRuntime(defaultHotspots);

        // Queue the LCP scene imagery before heavier overlay construction work.
        measureSyncSection('naimean-create-scene-tiles', createSceneTiles);
        measureSyncSection('naimean-create-overlays', createOverlays);
        syncDiscordAuthBodyClass();
        syncDiscordButtonUi();
        syncLoginOverlayUi();
        if (restoredDiscordLoginFlowState?.showLogin) {
          setLeftMonitorState('login');
          if (restoredDiscordLoginFlowState.restorePowerOn && !isCommodorePoweringOn) {
            triggerCommodorePowerOnSequence();
          }
        }
        measureSyncSection('naimean-render-hotspots', renderHotspotLayers);
        if (useLiteRendering) {
          document.body.classList.add('lite-rendering');
        }

        measureSyncSection('naimean-initial-resize', resize);

        if (saveResultFlash) {
          debugStatus.textContent = saveResultFlash;
        }

        hydrateHotspotsFromServer({ hasSaveResultFlash: Boolean(saveResultFlash) });
        scheduleNonCriticalTask(hydrateNonCriticalSceneData);
      }

      viewport.addEventListener('wheel', onWheel, { passive: false });
      viewport.addEventListener('pointerdown', onPointerDown);
      viewport.addEventListener('pointermove', onPointerMove);
      viewport.addEventListener('pointerup', onPointerUp);
      viewport.addEventListener('pointercancel', onPointerUp);
      hotspotLayer.addEventListener('click', (event) => {
        if (Date.now() < suppressHotspotClickUntil) {
          event.preventDefault();
          event.stopPropagation();
        }
      }, true);

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keydown', handleBigTvPromptTyping);
      window.addEventListener('pageshow', syncStoredCommodorePowerState);
      document.addEventListener('fullscreenchange', syncBigTvFullscreenUi);
      window.addEventListener('resize', resize);
      window.addEventListener('beforeunload', cleanup, { once: true });
      debugToggleButton.addEventListener('click', onDebugButtonClick);
      debugObjectSelect.addEventListener('change', refreshDebugObjectActions);
      debugObjectLockButton.addEventListener('click', () => {
        const selectedEl = getSelectedDebugHotspotElement();
        if (!selectedEl) return;
        setHotspotDebugLockState(selectedEl.id, true);
      });
      debugObjectUnlockButton.addEventListener('click', () => {
        const selectedEl = getSelectedDebugHotspotElement();
        if (!selectedEl) return;
        setHotspotDebugLockState(selectedEl.id, false);
      });

      if (debugUrlSaveButton && debugUrlInput) {
        const saveDebugUrl = () => {
          const selectedEl = getSelectedDebugHotspotElement();
          if (!selectedEl) return;
          if (!saveDenUrlOverride(selectedEl.id, debugUrlInput.value)) return;
          debugUrlSaveButton.textContent = 'Saved!';
          setTimeout(() => { debugUrlSaveButton.textContent = 'Save URL'; }, 2000);
        };
        debugUrlSaveButton.addEventListener('click', saveDebugUrl);
        debugUrlInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveDebugUrl();
          }
        });
      }

      saveBtn.addEventListener('click', saveHotspots);

      document.getElementById('save-modal-close-btn').addEventListener('click', hideSaveModal);

      document.getElementById('save-modal-copy-btn').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const copy = () => {
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Copy to clipboard'; }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(saveModalTextarea.value).then(copy).catch(() => {
            saveModalTextarea.select();
            if (document.execCommand('copy')) copy();
          });
        } else {
          saveModalTextarea.select();
          if (document.execCommand('copy')) copy();
        }
      });

      // Close save modal on backdrop click
      saveModal.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) {
          hideSaveModal();
        }
      });

      // Discord OAuth error notification
      (() => {
        const DISCORD_ERROR_MESSAGES = {
          access_denied: 'Discord sign-in was cancelled.',
          configuration_error: 'Discord sign-in is not available right now. Please try again later.',
          state_mismatch: 'Sign-in session expired. Please try again.',
          invalid_request: 'Sign-in was interrupted. Please try again.',
          token_exchange_failed: 'Failed to sign in with Discord. Please try again.',
          user_fetch_failed: 'Failed to retrieve your Discord account. Please try again.',
        };
        const params = new URLSearchParams(window.location.search);
        const errorCode = params.get('discord_error');
        if (errorCode) {
          const toast = document.getElementById('discord-error-toast');
          const msg = document.getElementById('discord-error-toast-msg');
          msg.textContent = DISCORD_ERROR_MESSAGES[errorCode] || 'Discord sign-in failed. Please try again.';
          toast.classList.remove('hidden');
          document.getElementById('discord-error-toast-close').addEventListener('click', () => {
            toast.classList.add('hidden');
          });
          params.delete('discord_error');
          const newSearch = params.toString();
          history.replaceState(null, '', window.location.pathname + (newSearch ? '?' + newSearch : ''));
        }
      })();

      observePerformanceMetrics();
      initializeScene();
      markSceneReady();
    })();
  

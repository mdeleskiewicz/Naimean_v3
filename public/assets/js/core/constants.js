const frameBoundsToScreenBoundsForConstants = (frameBounds, insets) => {
  const usableWidthRatio = Math.max(0.0001, 1 - insets.left - insets.right);
  const usableHeightRatio = Math.max(0.0001, 1 - insets.top - insets.bottom);
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
};

export const DESIGN_HEIGHT = 2160;
export const TILE_WIDTH = 3840;
export const SCENE_OFFSET_X = TILE_WIDTH;
export const DESK_CENTER_X = SCENE_OFFSET_X + 1689; // Lower monitor bank center: ((left x=1331) + (right edge=1758+288)) / 2 ≈ 1688.5.
export const WHEEL_SCROLL_MULTIPLIER = 2.2;
export const LINE_SCROLL_PIXELS = 40;
export const DOM_DELTA_LINE = 1;
export const DOM_DELTA_PAGE = 2;
export const DRAG_START_THRESHOLD_PX = 8;
export const CAMERA_SMOOTHING_FACTOR = 0.22;
export const CAMERA_SETTLE_EPSILON = 0.05;
export const CAMERA_MOTION_IDLE_TIMEOUT_MS = 140;
export const HOTSPOT_CLICK_SUPPRESSION_MS = 400;
export const HOTSPOT_API_PATH = '/api/hotspots';
export const SAVE_RESULT_FLASH_KEY = 'den_hotspot_save_result';
export const LEGACY_HOTSPOT_API_PATH = '/api/data';
export const LEGACY_HOTSPOT_RECORD_TITLE = 'den-hotspots-v3';
export const SAVE_BUTTON_RESET_MS = 2000;
export const COMMODORE_MONITOR_TURN_ON_MS = 2000;
export const API_TIMEOUT_MS = 5000;
export const MONITOR_POWER_CASCADE_MS = 4000;
export const MONITOR_INTERACTIVE_POLL_INTERVAL_MS = 500;
export const MONITOR_INTERACTIVE_BUFFER_MS = 1000;
export const BIG_TV_MONITOR_INTERACTIVE_WAIT_TIMEOUT_MS =
  COMMODORE_MONITOR_TURN_ON_MS + MONITOR_POWER_CASCADE_MS + MONITOR_INTERACTIVE_BUFFER_MS;
export const SAVE_RETRY_ATTEMPTS = 3;
export const SAVE_RETRY_DELAY_MS = 350;
export const TOUCH_MOMENTUM_DECAY = 0.004;
export const TOUCH_MOMENTUM_MIN_VELOCITY = 0.02;
export const NOAHS_ARCADE_URL = '/noahs-arcade.html';
export const COMMODORE_URL = '/commodore.html';
export const COMMODORE_NAV_SOURCE_STORAGE_KEY = 'commodore.navigation.source.v1';
export const COMMODORE_POWER_STATE_STORAGE_KEY = 'commodore.screen.poweredOn.v1';
export const COMMODORE_NAV_SOURCE_DEN = 'den';
export const CHAPEL_URL = '/chapel.html';
export const NOAHS_ARCADE_HOTSPOT_ID = 'noahs-arcade';
export const FIRST_TILE_HOTSPOT_IDS = new Set([NOAHS_ARCADE_HOTSPOT_ID]);
export const DESKTOP_DRAG_SCROLL_MULTIPLIER = 1;
export const MOBILE_DRAG_SCROLL_MULTIPLIER = 2;
export const MICROSOFT_WHITEBOARD_URL = 'https://whiteboard.cloud.microsoft/?lng=en-us&ref=oib-8ad27b9b-cce3-40c7-b658-b40c8163d34a';
export const SERVICE_NOW_ASSIGNED_WORK_URL =
  'https://recoverycoa.service-now.com/now/nav/ui/classic/params/target/incident_list.do?sysparm_query=stateNOT%20IN6%2C7%2C8%5Eassigned_to%3D7fc866ea1b1d7110153886a7624bcbc0&sysparm_first_row=1';
export const WHITEBOARD_HOTSPOT_URLS = Object.freeze({
  whiteboard: MICROSOFT_WHITEBOARD_URL,
  'rca-board': MICROSOFT_WHITEBOARD_URL,
  'rca-apps': 'https://www.naimean.com',
  'cap-ex': 'https://app.smartsheet.com/b/form/70b07591b76a4289bc6f5d5e1aabac91',
  'snow-tickets': SERVICE_NOW_ASSIGNED_WORK_URL,
  'ntst-cases':
    'https://support.netsmartconnect.com/solutionsupport?id=ntst_csm_cases&table=sn_customerservice_case&view=app_support&fixed_query=active%3Dtrue%5Econtact%3Djavascript%3Ags.getUserID()&o=sys_updated_on&d=desc',
  'jira-board': 'https://teamrca.atlassian.net/jira/software/projects/CA/boards/77?jql=assignee%20%3D%206228f47414cd2400690bf259',
  'change-mgmt': 'https://recoverycoa.service-now.com/now/nav/ui/classic/params/target/sn_chg_model_ui_landing.do',
  'change-mgmt-open':
    'https://recoverycoa.service-now.com/now/nav/ui/classic/params/target/change_request_list.do%3Fsysparm_userpref_module%3Dcd579a82c0a8016400aa77d97a4d70a8%26sysparm_query%3Dactive%253Dtrue%255EEQ%26active%3Dtrue'
});
export const WHITEBOARD_TASK_HOTSPOTS = [
  { id: 'cap-ex', label: 'Cap-Ex', x: 772, y: 462, w: 402, h: 120 },
  { id: 'snow-tickets', label: 'SNOW Tickets', x: 772, y: 614, w: 402, h: 120 },
  { id: 'ntst-cases', label: 'NTST Cases', x: 772, y: 766, w: 402, h: 120 },
  { id: 'jira-board', label: 'JIRA Board', x: 772, y: 918, w: 402, h: 120 },
  { id: 'change-mgmt', label: 'Change Mgmt New', x: 772, y: 1070, w: 402, h: 120 },
  { id: 'change-mgmt-open', label: 'Change Mgmt Open', x: 772, y: 1222, w: 402, h: 120 }
];
export const WHITEBOARD_HOTSPOT_IDS = new Set([
  'rca-board',
  'rca-apps',
  'whiteboard',
  ...WHITEBOARD_TASK_HOTSPOTS.map((spot) => spot.id)
]);
export const HOTSPOT_READABLE_LABELS = new Map([
  ['chapel', 'Chapel'],
  ...WHITEBOARD_TASK_HOTSPOTS.map(({ id, label }) => [id, label])
]);
export const AQUARIUM_HOTSPOT_IDS = new Set(['aquarium']);
export const NEDRY_GATE_TRIGGER_HOTSPOT_IDS = new Set([
  'overlay-big-tv-control',
  'right-monitor'
]);
export const DEFAULT_BIG_TV_RIGHT_MONITOR_OVERLAY_STATE = 'blue_discord';
export const BIG_TV_RIGHT_MONITOR_OVERLAY_CORNER_SCORE_STATE = 'corner_score';
export const BIG_TV_RIGHT_MONITOR_OVERLAY_STATE_UNKNOWN = 'unknown';
export const BIG_TV_RIGHT_MONITOR_OVERLAY_BLUE_IMAGE_URL = 'assets/images/join_disc_blue.png';
export const BIG_TV_RIGHT_MONITOR_OVERLAY_CORNER_SCORE_IMAGE_URL = 'assets/images/join_disc_green.png';
export const BIG_TV_SCREENSAVER_LOGO_URL = 'assets/images/dvd-logo.svg';
export const CORNER_SCORE_API_URL = '/api/corner-score';
export const CORNER_SCORE_SERVER_BASELINE = 0;
export const CORNER_SCORE_INITIALS_LENGTH = 3;
export const CORNER_SCORE_INITIALS_PLACEHOLDER = '__ __ __';
export const WRONG_AUDIO_URL = 'assets/audio/wrong.v20260424.mp3';
export const DVD_COLOR_STEPS = Object.freeze([
  { color: '#ff4d4d', hue: 0 },
  { color: '#40d6ff', hue: 170 },
  { color: '#7dff67', hue: 80 },
  { color: '#ffe066', hue: 40 },
  { color: '#ff78e2', hue: 300 }
]);
export const DVD_BOUNCE_SPEED_PX_PER_SECOND = 208;
export const DVD_SPEED_ADJUSTMENT_STEP = 0.1;
export const DVD_SPEED_MULTIPLIER_MIN = -5;
export const DVD_SPEED_MULTIPLIER_MAX = 5;
export const DVD_ACCELEROMETER_MULTIPLIER_MIN = -3;
export const DVD_ACCELEROMETER_MULTIPLIER_MAX = 3;
export const DVD_ACCELEROMETER_DEFAULT_MULTIPLIER = 1;
export const DVD_ACCELEROMETER_DEFAULT_POSITION =
  (DVD_ACCELEROMETER_DEFAULT_MULTIPLIER - DVD_ACCELEROMETER_MULTIPLIER_MIN)
  / (DVD_ACCELEROMETER_MULTIPLIER_MAX - DVD_ACCELEROMETER_MULTIPLIER_MIN);
export const DVD_FRAME_DELTA_MAX_SECONDS = 0.05;
export const DVD_CORNER_GOAL_TOLERANCE_PX = 3;
export const DVD_CORNER_MISS_MIN_TOLERANCE_PX = 4;
export const DVD_CORNER_MISS_MAX_TOLERANCE_PX = 16;
export const DVD_MISS_INDICATOR_DURATION_MS = 650;
export const AQUARIUM_STATIC_VIDEO_URL = 'assets/video/static.v20260424.mp4';
export const AQUARIUM_LOCAL_SHRIMP_CLIPS = Object.freeze(
  Array.from({ length: 23 }, (_, index) => `assets/video/shrimp/sh${index + 1}.mp4`)
);
export const AQUARIUM_CLIP_CATALOG_API_URL = '/api/aquarium/shrimp-clips';
export const AQUARIUM_CLIP_SOURCE_GOOGLE_DRIVE = 'google-drive';
export const AQUARIUM_CLIP_SOURCE_LOCAL_FALLBACK = 'local-fallback';
// On iOS, native fullscreen exit fires 'pause' before 'ended'. This tolerance
// (in seconds) lets the 'ended' event arrive before treating the pause as an
// interruption of the playback sequence.
export const MEDIA_ENDED_PAUSE_TOLERANCE_S = 0.5;
export const BIG_TV_DEBUG_WATERMARK_SERVER_ASSET = 'server_asset';
export const BIG_TV_DEBUG_WATERMARK_SHRIMP_CITY = 'google_drive';
export const BIG_TV_DEBUG_WATERMARK_DEFAULT_TOP_PX = 8;
export const BIG_TV_DEBUG_WATERMARK_MIN_TOP_MARGIN_PX = 2;
export const BIG_TV_DEBUG_WATERMARK_LETTERBOX_CLEARANCE_PX = 4;
export const RADIO_TUNING_AUDIO_URLS = [
  'assets/audio/frequency_search.mp3',
  'assets/audio/freesound_community-radio-tuning-switching-through-frequencies-german-radio-stations-14846.mp3',
  'assets/audio/freesound_community-static-poppy-light-107792.mp3',
  'assets/audio/freesound_community-high-pitch-large-102845.mp3'
];
export const RADIO_TUNING_STATION_POSITIONS = [0.06, 0.2, 0.36, 0.52, 0.68, 0.84, 0.95];
export const RADIO_TUNING_STATION_WIDTH = 0.06;
export const RADIO_TUNING_MOVEMENT_DECAY_ACTIVE = 0.45;
export const RADIO_TUNING_MOVEMENT_DECAY_IDLE = 0.8;
export const RADIO_TUNING_MOVEMENT_GAIN = 18;
export const RADIO_TUNING_MOVEMENT_FLOOR = 0.2;
export const RADIO_TUNING_WOBBLE_SPEED = 0.015;
export const RADIO_TUNING_WOBBLE_POSITION_FACTOR = 15;
export const RADIO_TUNING_WOBBLE_DEPTH = 0.08;
export const RADIO_TUNING_PLAYBACK_RATE_BASE = 0.84;
export const RADIO_TUNING_PLAYBACK_RATE_STATION_GAIN = 0.24;
export const RADIO_TUNING_PLAYBACK_RATE_MIN = 0.72;
export const RADIO_TUNING_PLAYBACK_RATE_MAX = 1.28;
export const RADIO_TUNING_VOLUME_BASE = 0.14;
export const RADIO_TUNING_VOLUME_STATION_GAIN = 0.74;
export const RADIO_TUNING_VOLUME_MOVEMENT_GAIN = 0.1;
export const RADIO_TUNING_VOLUME_MIN = 0.08;
export const NEDRY_GATE_VIDEO_URL = 'assets/video/nedrygate.mp4';
export const BIG_TV_RICKROLL_VIDEO_URL = 'assets/video/notarickroll-piece-1.v20260424.mp4';
export const ZELDA_SECRET_AUDIO_URL = 'assets/audio/zelda-secret.v20260424.mp3';
export const DISCORD_GUEST_INVITE_URL = 'https://discord.gg/kTkD7N3JN';
export const DISCORD_GUILD_ID = '';
export const DISCORD_WIDGET_URL = DISCORD_GUILD_ID
  ? `https://discord.com/widget?id=${DISCORD_GUILD_ID}&theme=dark`
  : null;
export const DISCORD_BUTTON_IMAGE_URL = BIG_TV_RIGHT_MONITOR_OVERLAY_BLUE_IMAGE_URL;
export const STARSHRIMP_LOGO_IMAGE_URL = 'assets/images/starshrimp_logo.png';
export const COMMODORE_DESK_IMAGE_URL = 'assets/images/commodore-desk-overlay.png';
export const LEFT_MONITOR_SIDE_FRAME_IMAGE_URL = 'assets/images/L_Frame.png';
export const RIGHT_MONITOR_SIDE_FRAME_IMAGE_URL = 'assets/images/R_Frame.png';
export const BIG_TV_PROMPT_PREFIX = 'Z:>';
export const BIG_TV_PROMPT_SECRET_TEXT = 'You didn\'t say the MAGIC WORD';
export const BIG_TV_PROMPT_ACCEPTED_VALUE = 'please';
export const BIG_TV_PROMPT_MIN_LOCAL_SCORE = 10;
export const BIG_TV_TOOLS_STORAGE_KEY = 'naimean.bigTvTools.entries';
export const DEN_URL_OVERRIDES_STORAGE_KEY = 'naimean.den.urlOverrides';
export const BIG_TV_TOOLS_LOGO_URL = 'assets/images/tools_logo.png';
export const LOGIN_LOGO_URL = 'assets/images/login_logo.png';
export const CALENDAR_MONTH_IMAGE_BASE_URL = 'assets/image/calendar';
export const CALENDAR_MONTH_IMAGE_START = Object.freeze({ year: 2026, month: 4 }); // May 2026, zero-based month
export const CALENDAR_MONTH_IMAGE_END = Object.freeze({ year: 2030, month: 4 }); // May 2030, zero-based month
export const CALENDAR_MONTH_NAME_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long' });
export const BIG_TV_INTERACTIVE_UI_SELECTORS = '.big-tv-prompt-content, .big-tv-prompt-secret-box, .big-tv-tools-overlay, .login-overlay, .calendar-big-tv-overlay, .big-tv-corner-score-initials-prompt, .big-tv-fullscreen-exit-button';
// Keep values comfortably within localStorage and the on-screen form layout.
export const BIG_TV_TOOLS_MAX_NAME_LENGTH = 120;
export const BIG_TV_TOOLS_MAX_URL_LENGTH = 2000;
export const DISCORD_CDN_BASE_URL = 'https://cdn.discordapp.com';
export const DISCORD_USER_ID_RE = /^\d+$/;
export const DISCORD_AVATAR_HASH_RE = /^(a_)?[a-f0-9]{32}$/i;
export const DISCORD_LOGIN_FLOW_STORAGE_KEY = 'naimean.discordLoginFlow.v1';
export const DISCORD_LOGIN_SEQUENCE_STEP_DELAY_MS = 900;
export const DISCORD_LOGIN_SEQUENCE_REDIRECT_DELAY_MS = 1200;
export const DISCORD_LOGIN_STEP_KEYS = Object.freeze(['display', 'oauth', 'return']);
export const PERFORMANCE_PANEL_QUERY_KEY = 'perf';
export const PERFORMANCE_METRIC_ORDER = Object.freeze(['LCP', 'INP', 'TTFB', 'JS boot']);
export const PERFORMANCE_PANEL_STYLES = [
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
export const MONITOR_STATIC_MIN_DURATION_MS = 1000;
export const MONITOR_STATIC_MAX_DURATION_MS = 2000;
export const MONITOR_CONTENT_MIN_DURATION_MS = 3000;
export const MONITOR_CONTENT_MAX_DURATION_MS = 5000;
export const LEFT_MONITOR_SEGMENTS = Object.freeze([
  // Order matches CSS grid flow (row-first): NW, NE, SW, SE
  { state: 'tools',    label: 'Tools',    quadrant: 'NW' },
  { state: 'login',    label: 'Login',    quadrant: 'NE' },
  { state: 'calendar', label: 'Calendar', quadrant: 'SW' },
  { state: 'mail',     label: 'Mail',     quadrant: 'SE' }
]);
export const LEFT_MONITOR_STATES = new Set([...LEFT_MONITOR_SEGMENTS.map(({ state }) => state), 'none']); // 'none' is valid but has no rendered segment
export const DEFAULT_LEFT_MONITOR_STATE = 'none';
export const LEFT_MONITOR_IMAGE_URLS = Object.freeze({
  login: 'assets/images/L_Monitor_Login.png',
  tools: 'assets/images/L_Monitor_Tools.png',
  calendar: 'assets/images/L_Monitor_Calendar.png',
  mail: 'assets/images/L_Monitor_Mail.png',
  none: 'assets/images/L_Monitor_None.png'
});
export const NOTES_URL = 'notes.html';
export const PENCIL_SHARPENER_HOTSPOT_ID = 'pencil-sharpener';
export const DISCORD_OVERLAY_ID = 'overlay-big-tv';
export const AQUARIUM_OVERLAY_ID = 'overlay-aquarium-video';
export const BIG_TV_FULLSCREEN_OVERLAY_IDS = new Set([DISCORD_OVERLAY_ID, AQUARIUM_OVERLAY_ID]);
export const FLIP_CLOCK_OVERLAY_ID = 'overlay-flip-clock';
export const CLOCK_URL_WINDOWS = 'ms-clock://';
export const CLOCK_URL_IOS = 'clock-alarm://';
export const WORLD_WIDTH_SEGMENTS = 3;
export const WORLD_WIDTH = WORLD_WIDTH_SEGMENTS * TILE_WIDTH;
export const WORLD_HEIGHT = DESIGN_HEIGHT;
export const SCENE_TILE_IMAGE_URLS = [
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
export const DISCORD_OVERLAY_CONTROL_ID = 'overlay-big-tv-control';
export const BIG_TV_SHADOW_LAYER_ID = 'big_tv_shadow_layer';
export const BIG_TV_SHADOW_LAYER_CONTROL_ID = 'big_tv_shadow_layer_control';
export const LEFT_MONITOR_OVERLAY_CONTROL_ID = 'overlay-left-monitor-control';
export const LEFT_MONITOR_SHADOW_LAYER_ID = 'left_monitor_shadow_layer';
export const LEFT_MONITOR_SHADOW_LAYER_CONTROL_ID = 'left_monitor_shadow_layer_control';
export const COMMODORE_OVERLAY_CONTROL_ID = 'overlay-commodore-screen-control';
export const COMMODORE_SHADOW_OVERLAY_ID = 'overlay-commodore-shadow';
export const COMMODORE_SHADOW_CONTROL_ID = 'overlay-commodore-shadow-control';
export const COMMODORE_POWER_BUTTON_OVERLAY_ID = 'overlay-commodore-power-button';
export const COMMODORE_POWER_BUTTON_CONTROL_ID = 'overlay-commodore-power-button-control';
export const MIN_HOTSPOT_SIZE = 20; // Keep editable hotspots large enough to remain targetable in debug mode.
export const MIN_MONITOR_RATIO_DENOMINATOR = 0.0001; // Prevents divide-by-zero when converting between screen-window and frame bounds.
export const LEGACY_MONITOR_BOUNDS_TOLERANCE_PX = 12; // Legacy monitor control bounds may drift slightly from expected monitor frame/screen-window coordinates.
export const COMMODORE_HITBOX_HORIZONTAL_INSET = 40; // Shrinks Commodore click area while preserving overlay artwork width.
export const COMMODORE_HITBOX_VERTICAL_INSET = 70; // Shrinks Commodore click area while preserving overlay artwork height.
export const COMMODORE_MIN_SOURCE_HITBOX_WIDTH = MIN_HOTSPOT_SIZE + (COMMODORE_HITBOX_HORIZONTAL_INSET * 2);
export const COMMODORE_MIN_SOURCE_HITBOX_HEIGHT = MIN_HOTSPOT_SIZE + (COMMODORE_HITBOX_VERTICAL_INSET * 2);
export const RIGHT_MONITOR_OVERLAY_CONTROL_ID = 'overlay-right-monitor-control';
export const RIGHT_MONITOR_SHADOW_LAYER_ID = 'right_monitor_shadow_layer';
export const RIGHT_MONITOR_SHADOW_LAYER_CONTROL_ID = 'right_monitor_shadow_layer_control';
export const LEFT_MONITOR_SIDE_FRAME_OVERLAY_ID = 'overlay-left-monitor-side-frame';
export const LEFT_MONITOR_SIDE_FRAME_CONTROL_ID = 'overlay-left-monitor-side-frame-control';
export const RIGHT_MONITOR_SIDE_FRAME_OVERLAY_ID = 'overlay-right-monitor-side-frame';
export const RIGHT_MONITOR_SIDE_FRAME_CONTROL_ID = 'overlay-right-monitor-side-frame-control';
export const WHITEBOARD_CORNER_SCORE_OVERLAY_ID = 'overlay-whiteboard-corner-score';
export const WHITEBOARD_CORNER_SCORE_CONTROL_ID = 'overlay-whiteboard-corner-score-control';
export const FLIP_CLOCK_OVERLAY_CONTROL_ID = 'overlay-flip-clock-control';
export const ASHTRAY_SMOKE_EFFECT_ID = 'ashtray-smoke-effect';
export const ASHTRAY_SMOKE_CONTROL_ID = 'ashtray-smoke-effect-control';
export const ASHTRAY_CIGARETTE_EFFECT_ID = 'ashtray-cigarette-effect';
export const ASHTRAY_CIGARETTE_CONTROL_ID = 'ashtray-cigarette-effect-control';
export const ASHTRAY_SMOKE_SOURCE_X = 1374;
export const ASHTRAY_SMOKE_Y = 1816;
export const SMOKE_CEILING_Y = 0;
export const SMOKE_FADE_TO_CEILING_RATIO = 0.6;
export const MIN_SMOKE_RISE_DISTANCE = 320;
export const SMOKE_SOURCE_VERTICAL_OFFSET = 64;
export const ASHTRAY_SMOKE_DEFAULT_WIDTH = 280;
export const ASHTRAY_SMOKE_TAIL_HEIGHT = 140;
export const ASHTRAY_CIGARETTE_DEFAULT_BOUNDS = Object.freeze({ x: 1292, y: 1802, w: 148, h: 44 });
export const COMMODORE_POWER_BUTTON_BOUNDS = Object.freeze({ x: 2143, y: 1637, w: 55, h: 39 });
export const LEFT_MONITOR_FRAME_BOUNDS = Object.freeze({ x: 1331, y: 1020, w: 280, h: 220 });
export const RIGHT_MONITOR_FRAME_BOUNDS = Object.freeze({ x: 1758, y: 1014, w: 288, h: 228 });
export const LEFT_MONITOR_SCREEN_WINDOW_INSETS = Object.freeze({ top: 0.1709, right: 0.24414, bottom: 0.29297, left: 0.252 });
export const RIGHT_MONITOR_SCREEN_WINDOW_INSETS = Object.freeze({ top: 0.29297, right: 0.2526, bottom: 0.1709, left: 0.24414 });
export const LEFT_MONITOR_SCREEN_BOUNDS = Object.freeze(frameBoundsToScreenBoundsForConstants(LEFT_MONITOR_FRAME_BOUNDS, LEFT_MONITOR_SCREEN_WINDOW_INSETS));
export const RIGHT_MONITOR_SCREEN_BOUNDS = Object.freeze(frameBoundsToScreenBoundsForConstants(RIGHT_MONITOR_FRAME_BOUNDS, RIGHT_MONITOR_SCREEN_WINDOW_INSETS));
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
HOTSPOT_READABLE_LABELS.set(WHITEBOARD_CORNER_SCORE_CONTROL_ID, 'Whiteboard CornerScore High Score');
HOTSPOT_READABLE_LABELS.set(ASHTRAY_SMOKE_CONTROL_ID, 'Ashtray Smoke Effect');
HOTSPOT_READABLE_LABELS.set(ASHTRAY_CIGARETTE_CONTROL_ID, 'Ashtray Cigarette Effect');
export const LOCKED_DEBUG_HOTSPOT_IDS = new Set([
  'overlay-monitor-screen-control', // Keep legacy monitor control id locked if present in persisted hotspot data.
  'overlaymonitorscreencontrol'
]);
export const OVERLAY_CONTROL_BINDINGS = [
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
  { controlId: WHITEBOARD_CORNER_SCORE_CONTROL_ID, overlayId: WHITEBOARD_CORNER_SCORE_OVERLAY_ID },
  { controlId: FLIP_CLOCK_OVERLAY_CONTROL_ID, overlayId: FLIP_CLOCK_OVERLAY_ID },
  { controlId: ASHTRAY_SMOKE_CONTROL_ID, overlayId: ASHTRAY_SMOKE_EFFECT_ID },
  { controlId: ASHTRAY_CIGARETTE_CONTROL_ID, overlayId: ASHTRAY_CIGARETTE_EFFECT_ID }
];
export const OVERLAY_CONTROL_TO_OVERLAY_ID = new Map(
  OVERLAY_CONTROL_BINDINGS.map(({ controlId, overlayId }) => [controlId, overlayId])
);
export const OVERLAY_ID_TO_CONTROL_ID = new Map(
  OVERLAY_CONTROL_BINDINGS.map(({ controlId, overlayId }) => [overlayId, controlId])
);
export const MONITOR_SCREEN_INSETS_BY_CONTROL_ID = new Map([
  [LEFT_MONITOR_OVERLAY_CONTROL_ID, LEFT_MONITOR_SCREEN_WINDOW_INSETS],
  [RIGHT_MONITOR_OVERLAY_CONTROL_ID, RIGHT_MONITOR_SCREEN_WINDOW_INSETS]
]);
export const MONITOR_FRAME_BOUNDS_BY_OVERLAY_CONTROL_ID = new Map([
  [LEFT_MONITOR_OVERLAY_CONTROL_ID, LEFT_MONITOR_FRAME_BOUNDS],
  [RIGHT_MONITOR_OVERLAY_CONTROL_ID, RIGHT_MONITOR_FRAME_BOUNDS]
]);
export const MONITOR_SCREEN_INSETS_BY_SIDE_FRAME_CONTROL_ID = new Map([
  [LEFT_MONITOR_SIDE_FRAME_CONTROL_ID, LEFT_MONITOR_SCREEN_WINDOW_INSETS],
  [RIGHT_MONITOR_SIDE_FRAME_CONTROL_ID, RIGHT_MONITOR_SCREEN_WINDOW_INSETS]
]);
export const MONITOR_SCREEN_INSETS_BY_OVERLAY_ID = new Map([
  ['overlay-left-monitor', LEFT_MONITOR_SCREEN_WINDOW_INSETS],
  ['overlay-right-monitor', RIGHT_MONITOR_SCREEN_WINDOW_INSETS]
]);

// Fixed pixel hotspots in design-space coordinates.
// Edit x/y/w/h values as artwork alignment is refined.
export const defaultHotspots = [
  { id: NOAHS_ARCADE_HOTSPOT_ID, x: 880, y: 320, w: 2050, h: 1280 },
  { id: 'aquarium', x: 2680, y: 445, w: 455, h: 729 },
  { id: 'rca-board', x: 738, y: 380, w: 470, h: 1060 },
  { id: WHITEBOARD_CORNER_SCORE_CONTROL_ID, x: 785, y: 456, w: 355, h: 260 },
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
export const overlayDefaults = [
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
  { id: WHITEBOARD_CORNER_SCORE_OVERLAY_ID, x: 785, y: 456, w: 355, h: 260 },
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

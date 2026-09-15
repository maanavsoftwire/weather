import tzlookup from 'tz-lookup';

export function resolveTimeZone(latitude: number, longitude: number): string {
    return tzlookup(latitude, longitude);
}

export function formatLocalTime(isoTime: string, timeZone: string): string {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date(isoTime));
}

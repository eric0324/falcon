import {
  ConnectorCapabilities,
  ListParams,
  MutateParams,
  OperationResult,
} from "../base";
import { GoogleBaseConnector } from "./base";

// Google Calendar API types
interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string;
  htmlLink?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
  };
  conferenceData?: {
    conferenceId?: string;
    conferenceSolution?: {
      name: string;
      iconUri: string;
    };
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
  };
  hangoutLink?: string;
}

interface CalendarListResponse {
  items: CalendarEvent[];
  nextPageToken?: string;
}

interface CalendarListItem {
  id: string;
  summary: string;
  primary?: boolean;
}

export class GoogleCalendarConnector extends GoogleBaseConnector {
  constructor(userId: string) {
    super({ userId, service: "CALENDAR" });
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      canQuery: false,
      canList: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    };
  }

  /**
   * List calendars or events
   *
   * resource formats:
   * - "" or undefined: List all calendars
   * - "calendarId": List events in calendar (use "primary" for primary calendar)
   * - "calendarId/eventId": Get specific event
   *
   * filters (for events):
   * - timeMin: ISO date string (start of range)
   * - timeMax: ISO date string (end of range)
   * - search: Search query
   */
  async list(params: ListParams): Promise<OperationResult> {
    const resource = params.resource || "";
    const { filters = {}, limit = 50 } = params;

    try {
      // List all calendars
      if (!resource) {
        return await this.listCalendars();
      }

      // Parse resource: calendarId or calendarId/eventId
      const [calendarId, eventId] = resource.split("/");

      if (eventId) {
        // Get specific event
        return await this.getEvent(calendarId, eventId);
      }

      // List events in calendar
      return await this.listEvents(calendarId, filters, limit);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a new calendar event
   *
   * resource: calendarId (use "primary" for primary calendar)
   * data: { summary, description?, location?, start, end, attendees?, createMeet? }
   *
   * If createMeet is true, a Google Meet link will be automatically created
   */
  async create(params: MutateParams): Promise<OperationResult> {
    const { resource, data } = params;
    const calendarId = resource || "primary";

    if (!data.summary || !data.start || !data.end) {
      return {
        success: false,
        error: "summary, start, and end are required",
      };
    }

    try {
      // Build event body
      const eventBody: Record<string, unknown> = {
        summary: data.summary,
        description: data.description,
        location: data.location,
        start: this.formatDateTime(data.start as string),
        end: this.formatDateTime(data.end as string),
        attendees: data.attendees
          ? (data.attendees as string[]).map((email) => ({ email }))
          : undefined,
      };

      // Add Google Meet conference if requested
      if (data.createMeet) {
        eventBody.conferenceData = {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        };
      }

      // Build URL with conferenceDataVersion if creating Meet
      let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
      if (data.createMeet) {
        url += "?conferenceDataVersion=1";
      }

      const event = await this.googleFetch<CalendarEvent>(url, {
        method: "POST",
        body: JSON.stringify(eventBody),
      });

      return {
        success: true,
        data: this.formatEvent(event),
        rowCount: 1,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update a calendar event
   *
   * resource: "calendarId/eventId"
   * data: Fields to update (summary, description, location, start, end, attendees)
   */
  async update(params: MutateParams): Promise<OperationResult> {
    const { resource, data } = params;

    if (!resource.includes("/")) {
      return { success: false, error: "Resource must be calendarId/eventId" };
    }

    const [calendarId, eventId] = resource.split("/");

    try {
      // Build update body with only provided fields
      const updateBody: Record<string, unknown> = {};
      if (data.summary) updateBody.summary = data.summary;
      if (data.description) updateBody.description = data.description;
      if (data.location) updateBody.location = data.location;
      if (data.start) updateBody.start = this.formatDateTime(data.start as string);
      if (data.end) updateBody.end = this.formatDateTime(data.end as string);
      if (data.attendees) {
        updateBody.attendees = (data.attendees as string[]).map((email) => ({
          email,
        }));
      }

      const event = await this.googleFetch<CalendarEvent>(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
          method: "PATCH",
          body: JSON.stringify(updateBody),
        }
      );

      return {
        success: true,
        data: this.formatEvent(event),
        rowCount: 1,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete a calendar event
   *
   * resource: "calendarId/eventId"
   */
  async delete(params: MutateParams): Promise<OperationResult> {
    const { resource } = params;

    if (!resource.includes("/")) {
      return { success: false, error: "Resource must be calendarId/eventId" };
    }

    const [calendarId, eventId] = resource.split("/");

    try {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return { success: true, rowCount: 1 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Private helper methods

  private async listCalendars(): Promise<OperationResult> {
    const result = await this.googleFetch<{ items: CalendarListItem[] }>(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer"
    );

    return {
      success: true,
      data: result.items.map((cal) => ({
        id: cal.id,
        name: cal.summary,
        isPrimary: cal.primary ?? false,
      })),
      rowCount: result.items.length,
    };
  }

  private async listEvents(
    calendarId: string,
    filters: Record<string, unknown>,
    limit: number
  ): Promise<OperationResult> {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
    );

    url.searchParams.set("maxResults", String(Math.min(limit, 100)));
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");

    // Time range filters
    if (filters.timeMin) {
      url.searchParams.set("timeMin", filters.timeMin as string);
    } else {
      // Default to today
      url.searchParams.set("timeMin", new Date().toISOString());
    }

    if (filters.timeMax) {
      url.searchParams.set("timeMax", filters.timeMax as string);
    }

    // Search query
    if (filters.search) {
      url.searchParams.set("q", filters.search as string);
    }

    const result = await this.googleFetch<CalendarListResponse>(url.toString());

    return {
      success: true,
      data: result.items.map(this.formatEvent),
      rowCount: result.items.length,
    };
  }

  private async getEvent(
    calendarId: string,
    eventId: string
  ): Promise<OperationResult> {
    const event = await this.googleFetch<CalendarEvent>(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`
    );

    return {
      success: true,
      data: this.formatEvent(event),
    };
  }

  private formatEvent(event: CalendarEvent) {
    // Extract Meet link if available
    const meetLink = event.hangoutLink ||
      event.conferenceData?.entryPoints?.find(e => e.entryPointType === "video")?.uri;

    return {
      id: event.id,
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      isAllDay: !event.start.dateTime,
      status: event.status,
      htmlLink: event.htmlLink,
      meetLink,
      attendees: event.attendees?.map((a) => ({
        email: a.email,
        name: a.displayName,
        status: a.responseStatus,
      })),
      organizer: event.organizer,
    };
  }

  private formatDateTime(dateStr: string): { dateTime: string; timeZone: string } | { date: string } {
    // Check if it's a date-only string (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return { date: dateStr };
    }

    // Parse as ISO datetime
    const date = new Date(dateStr);
    return {
      dateTime: date.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
}

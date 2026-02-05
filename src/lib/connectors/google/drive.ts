import {
  ConnectorCapabilities,
  ListParams,
  OperationResult,
} from "../base";
import { GoogleBaseConnector } from "./base";

// Google Drive API types
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  parents?: string[];
  webViewLink?: string;
}

interface DriveListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

export class GoogleDriveConnector extends GoogleBaseConnector {
  constructor(userId: string) {
    super({ userId, service: "DRIVE" });
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      canQuery: false,
      canList: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    };
  }

  /**
   * List files and folders in Google Drive
   *
   * resource formats:
   * - "" or undefined: List files in root
   * - "folderId": List files in specific folder
   * - "file:fileId": Get file metadata
   *
   * filters:
   * - mimeType: Filter by MIME type (e.g., "application/pdf")
   * - search: Search query
   */
  async list(params: ListParams): Promise<OperationResult> {
    const resource = params.resource || "";
    const { filters = {}, limit = 50 } = params;

    try {
      // Get file metadata
      if (resource.startsWith("file:")) {
        const fileId = resource.replace("file:", "");
        return await this.getFileMetadata(fileId);
      }

      // List files
      return await this.listFiles(resource, filters, limit);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Private helper methods

  private async listFiles(
    folderId: string,
    filters: Record<string, unknown>,
    limit: number
  ): Promise<OperationResult> {
    // Build query parts
    const queryParts: string[] = [];

    // Folder filter
    if (folderId) {
      queryParts.push(`'${folderId}' in parents`);
    }

    // MIME type filter
    if (filters.mimeType) {
      queryParts.push(`mimeType='${filters.mimeType}'`);
    }

    // Search filter - use fullText to search file content as well
    if (filters.search) {
      // fullText searches file name, content, and description
      queryParts.push(`fullText contains '${filters.search}'`);
    }

    // Exclude trashed files
    queryParts.push("trashed=false");

    const query = queryParts.join(" and ");

    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", query);
    url.searchParams.set("pageSize", String(Math.min(limit, 100)));
    url.searchParams.set(
      "fields",
      "files(id,name,mimeType,createdTime,modifiedTime,size,parents,webViewLink),nextPageToken"
    );
    url.searchParams.set("orderBy", "modifiedTime desc");

    // Include shared drives (team drives) in search results
    url.searchParams.set("includeItemsFromAllDrives", "true");
    url.searchParams.set("supportsAllDrives", "true");

    // Also search shared files (not just owned by me)
    url.searchParams.set("corpora", "allDrives");

    const result = await this.googleFetch<DriveListResponse>(url.toString());

    return {
      success: true,
      data: result.files.map((file) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        createdAt: file.createdTime,
        modifiedAt: file.modifiedTime,
        size: file.size ? parseInt(file.size) : undefined,
        parentId: file.parents?.[0],
        webViewLink: file.webViewLink,
        isFolder: file.mimeType === "application/vnd.google-apps.folder",
      })),
      rowCount: result.files.length,
    };
  }

  private async getFileMetadata(fileId: string): Promise<OperationResult> {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,createdTime,modifiedTime,size,parents,webViewLink,description`;

    const file = await this.googleFetch<DriveFile & { description?: string }>(url);

    return {
      success: true,
      data: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        createdAt: file.createdTime,
        modifiedAt: file.modifiedTime,
        size: file.size ? parseInt(file.size) : undefined,
        parentId: file.parents?.[0],
        webViewLink: file.webViewLink,
        isFolder: file.mimeType === "application/vnd.google-apps.folder",
      },
    };
  }
}

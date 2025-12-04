// SharePoint metadata utility for setting file properties/status
import { uploadToSharePointSite } from '@/utils/microsoft-auth';

export interface SharePointMetadata {
  Status?: 'Pending Review' | 'Approved' | 'Rejected';
  ApprovedBy?: string;
  ApprovalDate?: string;
  InspectionType?: string;
  InspectionLocation?: string;
  InspectorName?: string;
  ReviewComments?: string;
}

/**
 * Upload file to SharePoint with metadata/status
 */
export async function uploadToSharePointWithMetadata(
  accessToken: string,
  siteUrl: string,
  libraryName: string,
  fileName: string,
  fileBuffer: ArrayBuffer,
  metadata: SharePointMetadata,
  folderPath?: string
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  try {
    // First, upload the file
    const uploadResult = await uploadToSharePointSite(
      accessToken,
      siteUrl,
      libraryName,
      fileName,
      fileBuffer,
      folderPath
    );

    if (!uploadResult.success) {
      return uploadResult;
    }

    // Then, update the file metadata
    await updateSharePointFileMetadata(
      accessToken,
      siteUrl,
      libraryName,
      fileName,
      metadata,
      folderPath
    );

    return uploadResult;
  } catch (error) {
    console.error('SharePoint upload with metadata error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Update metadata/properties on an existing SharePoint file
 */
export async function updateSharePointFileMetadata(
  accessToken: string,
  siteUrl: string,
  libraryName: string,
  fileName: string,
  metadata: SharePointMetadata,
  folderPath?: string
): Promise<void> {
  try {
    // Extract site path from URL
    const url = new URL(siteUrl);
    const sitePath = url.pathname;

    // Get site ID
    const siteResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${url.hostname}:${sitePath}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!siteResponse.ok) {
      throw new Error('Failed to get SharePoint site information');
    }

    const siteData = await siteResponse.json();
    const siteId = siteData.id;

    // Get the file item
    const filePath = folderPath
      ? `/${libraryName}/${folderPath}/${fileName}`
      : `/${libraryName}/${fileName}`;

    const fileResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:${filePath}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!fileResponse.ok) {
      throw new Error('Failed to get file information');
    }

    const fileData = await fileResponse.json();
    const itemId = fileData.id;

    // Get the list item associated with the file
    const listItemResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}/listItem`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!listItemResponse.ok) {
      throw new Error('Failed to get list item');
    }

    const listItemData = await listItemResponse.json();

    // Prepare metadata fields
    // SharePoint internal field names use the format: field_0 (no spaces, replaced with _x0020_)
    const fields: Record<string, any> = {};

    if (metadata.Status) {
      fields.Status = metadata.Status;
    }

    if (metadata.ApprovedBy) {
      fields.ApprovedBy = metadata.ApprovedBy;
    }

    if (metadata.ApprovalDate) {
      fields.ApprovalDate = metadata.ApprovalDate;
    }

    if (metadata.InspectionType) {
      fields.InspectionType = metadata.InspectionType;
    }

    if (metadata.InspectionLocation) {
      fields.InspectionLocation = metadata.InspectionLocation;
    }

    if (metadata.InspectorName) {
      fields.InspectorName = metadata.InspectorName;
    }

    if (metadata.ReviewComments) {
      fields.ReviewComments = metadata.ReviewComments;
    }

    // Update the list item with metadata
    const updateResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listItemData.parentReference.id}/items/${listItemData.id}/fields`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fields),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('Metadata update error:', errorData);
      throw new Error(
        `Failed to update metadata: ${errorData.error?.message || 'Unknown error'}`
      );
    }

    console.log('✅ SharePoint metadata updated successfully:', fields);
  } catch (error) {
    console.error('Error updating SharePoint metadata:', error);
    // Don't throw - file is already uploaded, metadata is optional
  }
}

/**
 * Get file metadata from SharePoint
 */
export async function getSharePointFileMetadata(
  accessToken: string,
  siteUrl: string,
  libraryName: string,
  fileName: string,
  folderPath?: string
): Promise<SharePointMetadata | null> {
  try {
    const url = new URL(siteUrl);
    const sitePath = url.pathname;

    // Get site ID
    const siteResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${url.hostname}:${sitePath}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!siteResponse.ok) {
      throw new Error('Failed to get SharePoint site');
    }

    const siteData = await siteResponse.json();
    const siteId = siteData.id;

    // Get the file
    const filePath = folderPath
      ? `/${libraryName}/${folderPath}/${fileName}`
      : `/${libraryName}/${fileName}`;

    const fileResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:${filePath}:/listItem?expand=fields`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!fileResponse.ok) {
      throw new Error('Failed to get file metadata');
    }

    const fileData = await fileResponse.json();
    const fields = fileData.fields;

    return {
      Status: fields.Status,
      ApprovedBy: fields.ApprovedBy,
      ApprovalDate: fields.ApprovalDate,
      InspectionType: fields.InspectionType,
      InspectionLocation: fields.InspectionLocation,
      InspectorName: fields.InspectorName,
      ReviewComments: fields.ReviewComments,
    };
  } catch (error) {
    console.error('Error getting SharePoint metadata:', error);
    return null;
  }
}

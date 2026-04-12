/** Row shape for public.project_site_details */
export interface ProjectSiteDetails {
  access_notes: string | null;
  /** שדה ישן; נשמר לתאימות אחורה */
  cladding_color: string | null;
  carpet_cladding_color: string | null;
  fabric_cladding_color: string | null;
  notes: string | null;
  site_photo_paths: string[] | null;
  sketch_path: string | null;
  submitted_by_client: boolean;
  updated_at: string;
}

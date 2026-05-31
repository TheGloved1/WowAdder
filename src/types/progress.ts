export interface InstallProgressPayload {
  progress: number;
  stage: 'downloading' | 'extracting' | 'finishing';
  label: string;
}

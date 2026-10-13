export const publicInformationPaths = ['/privacy', '/terms', '/refunds', '/support', '/safety', '/account-deletion'];
export const isPublicInformationPath = (path: string) => publicInformationPaths.includes(path.replace(/\/$/, ''));

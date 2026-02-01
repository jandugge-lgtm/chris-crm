declare module "mailparser" {
  export function simpleParser(source: any): Promise<{
    subject?: string | null;
    to?: { text?: string | null } | null;
    from?: { text?: string | null } | null;
  }>;
}

{
  pkgs,
  ...
}:

{
  packages = [ pkgs.git ];

  languages.javascript = {
    enable = true;
    pnpm = {
      enable = true;
      install.enable = true;
    };
  };
  languages.typescript = {
    enable = true;
    lsp.enable = true;
  };
}

{
  pkgs,
  ...
}:

{
  packages = [ pkgs.git pkgs.biome ];

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

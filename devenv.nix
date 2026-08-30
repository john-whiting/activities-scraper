{
  pkgs,
  ...
}:

{
  packages = [ pkgs.git pkgs.biome ];

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_26;
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

package com.minecraft.realistic.gameplay;

public class MiningSystem {
    private int progress;
    private int efficiency;
    private Tool currentTool;

    public MiningSystem(Tool tool) {
        this.currentTool = tool;
        this.progress = 0;
        this.efficiency = calculateEfficiency(tool);
    }

    public void mineBlock() {
        progress += efficiency;
        System.out.println("Mining... Progress: " + progress + "%");
        if (progress >= 100) {
            System.out.println("Block mined!");
            resetProgress();
        }
    }

    private void resetProgress() {
        progress = 0;
    }

    private int calculateEfficiency(Tool tool) {
        // Example efficiency calculation based on tool type
        switch (tool.getType()) {
            case "pickaxe":
                return 25;
            case "shovel":
                return 20;
            case "axe":
                return 15;
            default:
                return 5;
        }
    }
}

class Tool {
    private String type;

    public Tool(String type) {
        this.type = type;
    }

    public String getType() {
        return type;
    }
}
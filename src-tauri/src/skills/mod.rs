use crate::models::Skill;
use std::fs;
use std::path::Path;
use regex::Regex;

pub fn get_skills_for_agent(agent_id: &str) -> Vec<Skill> {
    let registry = load_skills_from_folder();
    registry.into_iter()
        .filter(|s| {
            // 简单的映射逻辑：根据 agent_id 匹配对应的技能
            match agent_id {
                "manager" => s.id.contains("plan") || s.id.contains("management"),
                "designer" => s.id.contains("design") || s.id.contains("visual"),
                "copywriter" => s.id.contains("seo") || s.id.contains("copywriting"),
                "operator" => s.id.contains("data") || s.id.contains("market"),
                _ => false
            }
        })
        .collect()
}

pub fn load_skills_from_folder() -> Vec<Skill> {
    let mut skills = Vec::new();
    let base_path = Path::new("src-tauri/src/skills");
    
    if let Ok(entries) = fs::read_dir(base_path) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                let skill_md = entry.path().join("SKILL.md");
                if skill_md.exists() {
                    if let Ok(s) = parse_skill_file(&skill_md) {
                        skills.push(s);
                    }
                }
            }
        }
    }
    skills
}

fn parse_skill_file(path: &Path) -> Result<Skill, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(path)?;
    let re = Regex::new(r"(?s)^---\s*(.*?)\s*---\s*(.*)$")?;
    
    if let Some(caps) = re.captures(&content) {
        let yaml_str = caps.get(1).map_or("", |m| m.as_str());
        let body = caps.get(2).map_or("", |m| m.as_str());
        
        let mut name = String::new();
        let mut description = String::new();
        let mut triggers = Vec::new();
        
        for line in yaml_str.lines() {
            if line.starts_with("name:") {
                name = line.replace("name:", "").trim().to_string();
            } else if line.starts_with("description:") {
                description = line.replace("description:", "").trim().to_string();
            } else if line.starts_with("triggers:") {
                // 简易解析 triggers 列表
            } else if line.trim().starts_with("-") && !line.contains(":") {
                triggers.push(line.replace("-", "").trim().to_string());
            }
        }
        
        Ok(Skill {
            id: name.clone(),
            name,
            description,
            icon: "box".into(), // 默认
            triggers,
            content: body.to_string(),
        })
    } else {
        Err("Invalid SKILL.md format".into())
    }
}


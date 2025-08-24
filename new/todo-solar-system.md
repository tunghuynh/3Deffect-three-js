# TODO List: Chuyển đổi hiệu ứng thành Hệ Mặt Trời

## 🌌 1. Thiết lập Background Dải Ngân Hà
### Tasks:
- [ ] Tạo texture hoặc gradient cho background dải ngân hà
- [ ] Thêm hiệu ứng particles làm sao nhấp nháy
- [ ] Sử dụng màu tối với các điểm sáng (deep purple, dark blue, hints of pink/orange)
- [ ] Có thể thêm nebula effects bằng cách dùng multiple layers

### Code cần sửa:
- `main.js`: setupScene() - thay đổi scene.background
- Thêm star field generator function
- Có thể cần thêm skybox hoặc environment map

## ☀️ 2. Tạo Hệ thống Mặt Trời (Sun) ở trung tâm
### Tasks:
- [ ] Tạo sphere geometry cho mặt trời với kích thước lớn
- [ ] Thêm glow effect và corona effect cho mặt trời
- [ ] Sử dụng emissive material với màu vàng/cam
- [ ] Thêm particle system cho solar flares
- [ ] Animate: xoay chậm và pulse effect

### Properties:
- Radius: ~50-70 units
- Color: Gradient từ vàng nhạt đến cam đậm
- Glow: 2-3 layers với opacity khác nhau

## 🪐 3. Thiết kế và vẽ 8 quỹ đạo elip
### Tasks:
- [ ] Tạo function vẽ ellipse orbit lines
- [ ] Tính toán bán kính và độ lệch tâm cho mỗi quỹ đạo
- [ ] Sử dụng Line geometry hoặc Tube geometry
- [ ] Màu sắc: trắng mờ hoặc xanh nhạt với opacity thấp
- [ ] Hiển thị tất cả 8 quỹ đạo ngay từ cửa sổ đầu tiên

### Quỹ đạo theo thứ tự:
1. Mercury (Sao Thủy)
2. Venus (Sao Kim)
3. Earth (Trái Đất)
4. Mars (Sao Hỏa)
5. Jupiter (Sao Mộc)
6. Saturn (Sao Thổ)
7. Uranus (Sao Thiên Vương)
8. Neptune (Sao Hải Vương)

## 🌍 4. Tạo dữ liệu cho 8 hành tinh
### Tasks:
- [ ] Định nghĩa object chứa thông tin mỗi hành tinh
- [ ] Bao gồm: tên, kích thước, màu sắc, khoảng cách, tốc độ quay
- [ ] Tạo textures hoặc materials phù hợp cho mỗi hành tinh
- [ ] Thêm đặc điểm riêng (vành đai Sao Thổ, đốm đỏ Sao Mộc...)

### Data structure:
```javascript
const planets = [
  {
    name: "Mercury",
    radius: 5,
    color: 0x8C7853,
    distance: 100,
    speed: 0.02,
    rotationSpeed: 0.01
  },
  // ... các hành tinh khác
];
```

## 🪟 5. Implement logic hiển thị hành tinh theo số cửa sổ
### Tasks:
- [ ] Sửa updateNumberOfCubes() thành updateSolarSystem()
- [ ] Logic: windowCount = 1 → chỉ Sun; windowCount = 2 → Sun + Mercury; etc.
- [ ] Giới hạn tối đa 9 cửa sổ (1 Sun + 8 planets)
- [ ] Lưu trữ reference của mỗi hành tinh để update position
- [ ] Đảm bảo remove planets khi đóng cửa sổ

### Pseudocode:
```
if (windowCount >= 2) {
  // Thêm Mercury
}
if (windowCount >= 3) {
  // Thêm Venus
}
// ...
```

## 🔄 6. Thêm chuyển động quay quanh Mặt Trời
### Tasks:
- [ ] Implement orbital motion dựa trên thời gian
- [ ] Mỗi hành tinh có tốc độ quay khác nhau (theo tỷ lệ thực)
- [ ] Sử dụng trigonometry cho chuyển động elliptical
- [ ] Thêm rotation cho mỗi hành tinh (tự quay)
- [ ] Optional: thêm moons cho Earth, Jupiter, Saturn

### Motion formula:
```javascript
x = centerX + a * Math.cos(angle)
y = centerY + b * Math.sin(angle)
angle += speed * deltaTime
```

## ✨ 7. Tối ưu hiệu ứng và kiểm tra multiwindow
### Tasks:
- [ ] Test với nhiều cửa sổ mở cùng lúc
- [ ] Đảm bảo vị trí planets sync giữa các cửa sổ
- [ ] Optimize performance (LOD, frustum culling)
- [ ] Thêm hiệu ứng đặc biệt (asteroid belt, comets)
- [ ] Fine-tune lighting và shadows
- [ ] Thêm labels hoặc info cho mỗi hành tinh

### Performance considerations:
- Giảm polygon count cho distant planets
- Use instancing cho particles
- Limit particle count dựa trên số cửa sổ

## 📋 Additional Features (Optional)
- [ ] Thêm moon cho các hành tinh
- [ ] Asteroid belt giữa Mars và Jupiter
- [ ] Comet với đuôi sao chổi
- [ ] Planet info tooltip khi hover
- [ ] Realistic planet textures
- [ ] Day/night cycle cho Earth
- [ ] Ring system cho Saturn và Uranus
- [ ] Zoom in/out controls

## 🐛 Testing Checklist
- [ ] 1 window: Chỉ có Sun và orbit lines
- [ ] 2 windows: Sun + Mercury
- [ ] 3 windows: Sun + Mercury + Venus
- [ ] ...lần lượt đến 9 windows
- [ ] Đóng window: planets biến mất đúng thứ tự
- [ ] Performance với 9 windows mở
- [ ] Sync positions giữa các windows
- [ ] Smooth transitions khi add/remove planets
